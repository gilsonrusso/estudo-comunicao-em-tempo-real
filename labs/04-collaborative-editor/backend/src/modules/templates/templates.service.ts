import { randomUUID } from 'node:crypto';
import AdmZip from 'adm-zip';
import { Template, TemplateDetail, TemplateFile, CreateTemplateBody } from './templates.schema.js';
import { uploadToMinio, getFromMinio } from '../../infra/minio.js';
import { parseLatexZip } from '../../utils/latex-zip-parser.js';
import { getBuiltinCatalog, TemplateCatalogEntry } from './templates.seeder.js';

export class TemplatesService {
  private customTemplates: Map<string, TemplateDetail> = new Map();

  /**
   * Lista todos os templates disponíveis no sistema:
   * Catálogo oficial (pacotes .zip no MinIO) + templates customizados enviados por usuários
   */
  async listTemplates(): Promise<Template[]> {
    const catalog = getBuiltinCatalog();
    const builtins: Template[] = catalog.map((t: TemplateCatalogEntry) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      filesCount: t.filesCount,
      hasCls: t.hasCls,
      createdAt: '2026-01-01T00:00:00.000Z',
    }));

    const customs: Template[] = Array.from(this.customTemplates.values()).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      filesCount: t.files.length,
      hasCls: t.files.some((f) => f.path.endsWith('.cls')),
      createdAt: t.createdAt,
    }));

    return [...builtins, ...customs];
  }

  /**
   * Obtém os detalhes completos de um template descompactando o pacote oficial
   * diretamente a partir do bucket do MinIO em tempo de execução
   */
  async getTemplateById(id: string): Promise<TemplateDetail | null> {
    // 1. Verifica se é um template customizado já carregado em memória
    const custom = this.customTemplates.get(id);
    if (custom) return custom;

    // 2. Busca no catálogo oficial de templates
    const catalog = getBuiltinCatalog();
    const entry = catalog.find((t) => t.id === id);
    if (!entry) return null;

    // 3. Baixa o pacote oficial .zip armazenado no MinIO
    const minioKey = `templates/${id}/template.zip`;
    const { buffer: zipBuffer } = await getFromMinio(minioKey);

    // 4. Analisa e descompacta a estrutura LaTeX usando o parser oficial
    const parsed = parseLatexZip(zipBuffer);

    const files: TemplateFile[] = [
      {
        path: parsed.rootDoc.path,
        isMain: true,
        fileType: 'tex',
        content: parsed.rootDoc.content,
      },
    ];

    for (const file of parsed.files) {
      if (!file.isBinary && file.content !== undefined) {
        files.push({
          path: file.path,
          isMain: false,
          fileType: file.fileType,
          content: file.content,
        });
      } else if (file.isBinary) {
        files.push({
          path: file.path,
          isMain: false,
          fileType: file.fileType,
          storageKey: `templates/${id}/${file.path}`,
        });
      }
    }

    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      category: entry.category,
      filesCount: files.length,
      hasCls: files.some((f) => f.path.endsWith('.cls')),
      createdAt: '2026-01-01T00:00:00.000Z',
      files,
    };
  }

  /**
   * Cria um novo template a partir de conteúdo textual e empacota em .zip no MinIO
   */
  async createCustomTemplate(data: CreateTemplateBody): Promise<TemplateDetail> {
    const id = `tpl-${randomUUID().substring(0, 8)}`;
    const zip = new AdmZip();

    zip.addFile('main.tex', Buffer.from(data.mainContent, 'utf-8'));

    const files: TemplateFile[] = [
      {
        path: 'main.tex',
        isMain: true,
        fileType: 'tex',
        content: data.mainContent,
      },
    ];

    if (data.clsContent) {
      const clsName = data.clsFileName?.endsWith('.cls')
        ? data.clsFileName
        : `${data.clsFileName || 'custom'}.cls`;

      const clsBuffer = Buffer.from(data.clsContent, 'utf-8');
      zip.addFile(clsName, clsBuffer);

      files.push({
        path: clsName,
        isMain: false,
        fileType: 'style',
        content: data.clsContent,
      });

      // Salva o arquivo .cls individual no MinIO
      await uploadToMinio(`templates/${id}/${clsName}`, clsBuffer, 'text/plain');
    }

    // Salva o pacote .zip completo no MinIO
    await uploadToMinio(`templates/${id}/template.zip`, zip.toBuffer(), 'application/zip');

    const newTemplate: TemplateDetail = {
      id,
      name: data.name,
      description: data.description || 'Template customizado enviado pelo usuário.',
      category: data.category || 'custom',
      filesCount: files.length,
      hasCls: files.some((f) => f.path.endsWith('.cls')),
      createdAt: new Date().toISOString(),
      files,
    };

    this.customTemplates.set(id, newTemplate);
    return newTemplate;
  }

  /**
   * Cria um template a partir de upload de arquivo .zip e persiste o pacote no MinIO
   */
  async createTemplateFromZip(
    zipBuffer: Buffer,
    templateName?: string,
    description?: string,
    category: string = 'custom'
  ): Promise<TemplateDetail> {
    const id = `tpl-${randomUUID().substring(0, 8)}`;

    // 1. Salva o pacote ZIP original completo no MinIO
    await uploadToMinio(`templates/${id}/template.zip`, zipBuffer, 'application/zip');

    // 2. Extrai e analisa a estrutura
    const parsed = parseLatexZip(zipBuffer);

    const files: TemplateFile[] = [
      {
        path: parsed.rootDoc.path,
        isMain: true,
        fileType: 'tex',
        content: parsed.rootDoc.content,
      },
    ];

    for (const file of parsed.files) {
      if (!file.isBinary && file.content !== undefined) {
        files.push({
          path: file.path,
          isMain: false,
          fileType: file.fileType,
          content: file.content,
        });

        // Se for arquivo de estilo (.cls ou .sty), salva no MinIO para persistência de ativos
        if (file.fileType === 'style' || file.path.endsWith('.cls') || file.path.endsWith('.sty')) {
          await uploadToMinio(
            `templates/${id}/${file.path}`,
            Buffer.from(file.content, 'utf-8'),
            file.mimeType
          );
        }
      } else if (file.isBinary && file.buffer) {
        const storageKey = `templates/${id}/${file.path}`;
        await uploadToMinio(storageKey, file.buffer, file.mimeType);
        files.push({
          path: file.path,
          isMain: false,
          fileType: file.fileType,
          storageKey,
        });
      }
    }

    const finalName = templateName?.trim() || parsed.detectedTitle || 'Template Importado (.zip)';
    const newTemplate: TemplateDetail = {
      id,
      name: finalName,
      description: description?.trim() || 'Template customizado importado via arquivo .zip.',
      category,
      filesCount: files.length,
      hasCls: files.some((f) => f.path.endsWith('.cls')),
      createdAt: new Date().toISOString(),
      files,
    };

    this.customTemplates.set(id, newTemplate);
    return newTemplate;
  }
}

export const defaultTemplatesService = new TemplatesService();
