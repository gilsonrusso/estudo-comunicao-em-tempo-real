import { randomUUID } from 'crypto';
import {
  Document,
  DeltaOperation,
  DocumentOperation,
  DocumentSnapshot,
  ProjectFile,
} from './documents.schema.js';
import {
  IDocumentsRepository,
  PostgresDocumentsRepository,
} from './documents.repository.js';
import { redisPubClient } from '../../infra/redis.js';
import {
  uploadToS3,
  getFromS3,
  deleteFromS3,
  getInternalS3Url,
} from '../../infra/s3.js';

// Repositório conectado ao PostgreSQL
export const defaultDocumentsRepository = new PostgresDocumentsRepository();

interface ActiveDocState {
  content: string;
  version: number;
  pendingOps: number;
  debounceTimer: NodeJS.Timeout | null;
  lastAuthor: string;
  onSnapshotSaved?: (snapshot: DocumentSnapshot) => void;
}

export class DocumentsService {
  private activeDocs: Map<string, ActiveDocState> = new Map();

  constructor(
    private repository: IDocumentsRepository = defaultDocumentsRepository
  ) {}

  async getDocument(id: string): Promise<Document> {
    const doc = await this.repository.findById(id);
    if (!doc) {
      throw new Error(`Documento ${id} não encontrado`);
    }

    // Se já estiver em memória ativa, retorna o estado mais quente
    const active = this.activeDocs.get(id);
    if (active) {
      return {
        ...doc,
        content: active.content,
        version: active.version,
      };
    }

    // Carrega na memória ativa
    this.activeDocs.set(id, {
      content: doc.content,
      version: doc.version,
      pendingOps: 0,
      debounceTimer: null,
      lastAuthor: 'Sistema',
    });

    return doc;
  }

  async listDocuments(): Promise<Document[]> {
    return this.repository.findAll();
  }

  async createDocument(title: string, initialContent = ''): Promise<Document> {
    const id = randomUUID();
    const doc: Document = {
      id,
      title,
      content: initialContent,
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    await this.repository.create(doc);
    return doc;
  }

  async getHistory(documentId: string): Promise<{
    snapshots: DocumentSnapshot[];
    operations: DocumentOperation[];
  }> {
    const snapshots = await this.repository.getSnapshots(documentId);
    const operations = await this.repository.getOperations(documentId);
    return { snapshots, operations };
  }

  /**
   * Aplica um delta atômico no documento em tempo real
   */
  async applyDelta(
    documentId: string,
    delta: DeltaOperation,
    onSnapshotSaved?: (snapshot: DocumentSnapshot) => void
  ): Promise<{ operation: DocumentOperation; newContent: string; newVersion: number }> {
    let active = this.activeDocs.get(documentId);
    if (!active) {
      // Carrega do banco se não estiver em memória
      const doc = await this.getDocument(documentId);
      active = this.activeDocs.get(documentId)!;
    }

    if (onSnapshotSaved) {
      active.onSnapshotSaved = onSnapshotSaved;
    }

    // 1. Aplicação do Delta no texto em memória (Operação atômica)
    const pos = Math.max(0, Math.min(delta.position, active.content.length));
    if (delta.type === 'insert' && delta.text !== undefined) {
      active.content = active.content.slice(0, pos) + delta.text + active.content.slice(pos);
    } else if (delta.type === 'delete' && delta.length !== undefined) {
      active.content = active.content.slice(0, pos) + active.content.slice(pos + delta.length);
    }

    active.version++;
    active.pendingOps++;
    active.lastAuthor = delta.userName;

    // 2. Registra a operação no PostgreSQL (append-only) e no buffer do Redis
    const op: DocumentOperation = {
      id: randomUUID(),
      documentId,
      userId: delta.userId,
      userName: delta.userName,
      type: delta.type,
      position: delta.position,
      text: delta.text,
      length: delta.length,
      timestamp: delta.timestamp || Date.now(),
    };
    await this.repository.appendOperation(op);

    // Buffer rápido no Redis
    if (redisPubClient.isOpen) {
      await redisPubClient.rPush(`collab:doc:${documentId}:ops`, JSON.stringify(op));
    }

    // 3. Estratégia de Debounce: agenda gravação de Snapshot no PostgreSQL a cada 3s de inatividade
    if (active.debounceTimer) {
      clearTimeout(active.debounceTimer);
    }

    active.debounceTimer = setTimeout(async () => {
      await this.flushCheckpoint(documentId);
    }, 3000);

    return {
      operation: op,
      newContent: active.content,
      newVersion: active.version,
    };
  }

  /**
   * Consolidar e salvar o Snapshot no banco de dados (Checkpoint)
   */
  async flushCheckpoint(documentId: string): Promise<DocumentSnapshot | null> {
    const active = this.activeDocs.get(documentId);
    if (!active || active.pendingOps === 0) return null;

    console.log(`[PostgreSQL] 💾 Persistindo Checkpoint Snapshot do documento ${documentId} (Versão ${active.version})...`);

    // Atualiza o documento no banco relacional PostgreSQL
    await this.repository.updateContent(documentId, active.content, active.version);

    // Cria o registro imutável do Snapshot
    const snapshot: DocumentSnapshot = {
      id: randomUUID(),
      documentId,
      version: active.version,
      content: active.content,
      savedBy: active.lastAuthor,
      reason: `checkpoint_${active.pendingOps}_operacoes`,
      createdAt: new Date().toISOString(),
    };

    await this.repository.createSnapshot(snapshot);
    active.pendingOps = 0;
    active.debounceTimer = null;

    // Limpa o buffer de deltas consolidado no Redis
    if (redisPubClient.isOpen) {
      await redisPubClient.del(`collab:doc:${documentId}:ops`);
    }

    if (active.onSnapshotSaved) {
      active.onSnapshotSaved(snapshot);
    }

    return snapshot;
  }

  /**
   * Lista todos os arquivos do projeto (árvore de diretórios virtual)
   */
  async listProjectFiles(documentId: string): Promise<ProjectFile[]> {
    return this.repository.listProjectFiles(documentId);
  }

  /**
   * Realiza upload de arquivo/imagem para o MinIO e registra no banco relacional
   */
  async uploadProjectFile(
    documentId: string,
    virtualPath: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<ProjectFile> {
    // Normaliza o caminho (ex: "images/grafico.png")
    const cleanPath = virtualPath.replace(/^\/+/, '');
    const ext = cleanPath.split('.').pop()?.toLowerCase() || '';

    let fileType: string = 'other';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) {
      fileType = 'image';
    } else if (ext === 'bib') {
      fileType = 'bib';
    } else if (['sty', 'cls'].includes(ext)) {
      fileType = 'style';
    } else if (ext === 'tex') {
      fileType = 'tex';
    }

    const fileId = randomUUID();
    const storageKey = `${documentId}/${fileId}-${cleanPath.split('/').pop()}`;

    // 1. Salva o blob no MinIO S3
    await uploadToS3(storageKey, buffer, mimeType);

    // 2. Persiste metadados na tabela project_files
    const projectFile: ProjectFile = {
      id: fileId,
      documentId,
      path: cleanPath,
      fileType,
      mimeType,
      sizeBytes: buffer.length,
      storageKey,
      createdAt: new Date().toISOString(),
    };

    return this.repository.saveProjectFile(projectFile);
  }

  /**
   * Obtém o conteúdo binário de um arquivo armazenado no MinIO
   */
  async getProjectFileRaw(fileId: string): Promise<{ buffer: Buffer; mimeType: string; path: string }> {
    const file = await this.repository.findProjectFileById(fileId);
    if (!file || !file.storageKey) {
      throw new Error(`Arquivo ${fileId} não encontrado`);
    }

    const { buffer, contentType } = await getFromS3(file.storageKey);
    return {
      buffer,
      mimeType: file.mimeType || contentType,
      path: file.path,
    };
  }

  /**
   * Cria um novo arquivo de texto (ex: "references.bib", "preamble.tex") no projeto
   */
  async createProjectTextFile(
    documentId: string,
    virtualPath: string,
    content: string = ''
  ): Promise<ProjectFile> {
    const cleanPath = virtualPath.replace(/^\/+/, '');
    const ext = cleanPath.split('.').pop()?.toLowerCase() || '';

    let fileType: string = 'other';
    if (ext === 'bib') {
      fileType = 'bib';
    } else if (['sty', 'cls'].includes(ext)) {
      fileType = 'style';
    } else if (ext === 'tex') {
      fileType = 'tex';
    }

    const fileId = randomUUID();
    const projectFile: ProjectFile = {
      id: fileId,
      documentId,
      path: cleanPath,
      fileType,
      mimeType: fileType === 'tex' ? 'text/x-tex' : fileType === 'bib' ? 'text/plain' : 'text/plain',
      sizeBytes: Buffer.byteLength(content, 'utf-8'),
      storageKey: null,
      content,
      createdAt: new Date().toISOString(),
    };

    return this.repository.saveProjectFile(projectFile);
  }

  /**
   * Atualiza o conteúdo textual de um arquivo existente
   */
  async updateProjectFileContent(fileId: string, content: string): Promise<ProjectFile> {
    return this.repository.updateProjectFileContent(fileId, content);
  }

  /**
   * Remove arquivo do MinIO e do banco de dados
   */
  async deleteProjectFile(fileId: string): Promise<void> {
    const file = await this.repository.findProjectFileById(fileId);
    if (!file) return;

    if (file.storageKey) {
      try {
        await deleteFromS3(file.storageKey);
      } catch (err) {
        console.warn(`[MinIO S3] Falha ao deletar objeto ${file.storageKey}:`, err);
      }
    }

    await this.repository.deleteProjectFile(fileId);
  }

  /**
   * Delega a compilação do documento LaTeX com suporte a múltiplos arquivos e imagens para o micro-serviço TeX Live
   */
  async compileDocument(documentId: string): Promise<Buffer> {
    const doc = await this.getDocument(documentId);
    const compilerUrl = process.env.COMPILER_URL || 'http://compiler:4000';

    // Busca todos os arquivos associados ao projeto no PostgreSQL
    const projectFiles = await this.repository.listProjectFiles(documentId);

    // Constrói o manifesto de arquivos para o sandbox do compilador
    const filesPayload: Array<{
      path: string;
      type: 'text' | 'binary_url';
      content?: string;
      url?: string;
    }> = [
      {
        path: 'main.tex',
        type: 'text',
        content: doc.content,
      },
    ];

    for (const file of projectFiles) {
      if (file.content !== null && file.content !== undefined) {
        // Arquivo de texto (.bib, .tex complementar, .sty)
        filesPayload.push({
          path: file.path,
          type: 'text',
          content: file.content,
        });
      } else if (file.storageKey) {
        // Imagem binária armazenada no MinIO
        filesPayload.push({
          path: file.path,
          type: 'binary_url',
          url: getInternalS3Url(file.storageKey),
        });
      }
    }

    const response = await fetch(`${compilerUrl}/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId,
        mainEntry: 'main.tex',
        files: filesPayload,
      }),
    });

    if (!response.ok) {
      const errorJson = (await response.json().catch(() => ({ error: 'Falha na compilação' }))) as {
        error?: string;
        details?: string;
      };
      throw new Error(errorJson.details || errorJson.error || `Erro de compilação (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
