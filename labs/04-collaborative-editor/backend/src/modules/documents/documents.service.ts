import { randomUUID } from 'crypto';
import {
  Document,
  DeltaOperation,
  DocumentOperation,
  DocumentSnapshot,
  ProjectFile,
  ReviewComment,
  CommentReply,
} from './documents.schema.js';
import { IDocumentsRepository, PostgresDocumentsRepository } from './documents.repository.js';
import { redisPubClient } from '../../infra/redis.js';
import {
  uploadToMinio,
  getFromMinio,
  deleteFromMinio,
  getInternalMinioUrl,
} from '../../infra/minio.js';
import { defaultTemplatesService } from '../templates/templates.service.js';
import { parseLatexZip } from '../../utils/latex-zip-parser.js';
import { Text, ChangeSet } from '@codemirror/state';
import { Update, rebaseUpdates } from '@codemirror/collab';

// Repositório conectado ao PostgreSQL
export const defaultDocumentsRepository = new PostgresDocumentsRepository();

export interface ActiveFileCollab {
  doc: Text;
  version: number;
  updates: Update[];
}

export interface ActiveDocState {
  content: string;
  doc: Text;
  version: number;
  updates: Update[];
  filesCollab: Map<string, ActiveFileCollab>;
  opSeq: number;
  pendingOps: number;
  debounceTimer?: NodeJS.Timeout;
  lastAuthor: string;
  onSnapshotSaved?: (snapshot: DocumentSnapshot) => void;
}
export class DocumentsService {
  private activeDocs: Map<string, ActiveDocState> = new Map();
  private commentsMap: Map<string, ReviewComment[]> = new Map();

  constructor(private repository: IDocumentsRepository = defaultDocumentsRepository) {
    // Seed de comentários de revisão para o documento padrão 'doc-1'
    this.commentsMap.set('doc-1', [
      {
        id: 'comm-1',
        documentId: 'doc-1',
        file: 'main.tex',
        from: 350,
        to: 450,
        selectedText:
          'sincronização colaborativa em tempo real com Transformação Operacional (OT) e persistência de duas camadas',
        userId: 'reviewer-1',
        userName: 'Prof. Carlos',
        userColor: '#9333ea',
        content:
          'Excelente contextualização. Poderíamos adicionar uma menção explícita ao algoritmo de State Machine Replication e consistência eventual?',
        status: 'open',
        createdAt: new Date(Date.now() - 3600000 * 2).toLocaleTimeString(),
        replies: [
          {
            id: 'rep-1',
            userId: 'author-alice',
            userName: 'Alice Silva',
            userColor: '#059669',
            content:
              'Concordo professor! Já preparei a citação da bibliografia para incluir na Seção 2.',
            createdAt: new Date(Date.now() - 3600000 * 1).toLocaleTimeString(),
          },
        ],
      },
      {
        id: 'comm-2',
        documentId: 'doc-1',
        file: 'main.tex',
        from: 1050,
        to: 1100,
        selectedText: 'architecture.png',
        userId: 'reviewer-2',
        userName: 'Revisor Anônimo 2',
        userColor: '#ea580c',
        content:
          'Verificar se o arquivo PNG no bucket MinIO possui resolução mínima de 300 DPI conforme as diretrizes da conferência IEEE/ACM.',
        status: 'open',
        createdAt: new Date(Date.now() - 1800000).toLocaleTimeString(),
        replies: [],
      },
    ]);
  }

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
        content: active.doc.toString(),
        version: active.updates.length,
      };
    }

    // Carrega na memória ativa com representação Text do CodeMirror
    const textDoc = Text.of(doc.content.split('\n'));
    this.activeDocs.set(id, {
      content: doc.content,
      doc: textDoc,
      version: doc.version,
      updates: [],
      filesCollab: new Map(),
      opSeq: 0,
      pendingOps: 0,
      debounceTimer: undefined,
      lastAuthor: 'Sistema',
    });

    return doc;
  }

  getCollabVersion(documentId: string, file = 'main.tex'): number {
    const active = this.activeDocs.get(documentId);
    if (!active) return 0;
    if (file === 'main.tex') {
      return active.updates.length;
    }
    const fileCollab = active.filesCollab.get(file);
    return fileCollab ? fileCollab.updates.length : 0;
  }

  getUpdatesSince(
    documentId: string,
    file = 'main.tex',
    sinceVersion = 0
  ): Array<{ clientID: string; changes: unknown }> {
    const active = this.activeDocs.get(documentId);
    if (!active) return [];
    const list = file === 'main.tex' ? active.updates : active.filesCollab.get(file)?.updates || [];
    const clamped = Math.max(0, Math.min(sinceVersion, list.length));
    return list.slice(clamped).map((u) => ({
      clientID: u.clientID,
      changes: u.changes.toJSON(),
    }));
  }

  async listDocuments(): Promise<Document[]> {
    return this.repository.findAll();
  }

  async createDocument(
    title: string,
    templateId?: string,
    initialContent?: string
  ): Promise<Document> {
    const id = randomUUID();
    let finalContent = initialContent ?? '';

    // Se um template for especificado, busca os arquivos correspondentes
    const template = templateId ? await defaultTemplatesService.getTemplateById(templateId) : null;
    if (template) {
      const mainFile = template.files.find((f) => f.isMain || f.path === 'main.tex');
      if (mainFile && !initialContent) {
        finalContent = mainFile.content || '';
      }
    }

    const doc: Document = {
      id,
      title,
      content: finalContent,
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    await this.repository.create(doc);

    // Registra a Versão 1 inicial no histórico de snapshots
    await this.repository.createSnapshot({
      id: randomUUID(),
      documentId: id,
      version: 1,
      content: finalContent,
      savedBy: 'Sistema',
      reason: 'versao_inicial',
      createdAt: doc.updatedAt,
    });

    // Se o template possuir arquivos adicionais (.cls, .bib, imagens), associa-os ao novo projeto
    if (template) {
      for (const file of template.files) {
        if (file.isMain || file.path === 'main.tex') continue;
        if (file.content !== undefined && file.content !== null) {
          try {
            await this.createProjectTextFile(id, file.path, file.content);
          } catch (fileErr) {
            console.warn(
              `[Template Init] Erro ao criar arquivo ${file.path} para o documento ${id}:`,
              fileErr
            );
          }
        } else if (file.storageKey) {
          try {
            const { buffer, contentType } = await getFromMinio(file.storageKey);
            await this.uploadProjectFile(id, file.path, buffer, contentType);
          } catch (fileErr) {
            console.warn(
              `[Template Init] Erro ao clonar ativo binário ${file.path} para o documento ${id}:`,
              fileErr
            );
          }
        }
      }
    }

    return doc;
  }

  /**
   * Cria um novo artigo a partir da descompactação de um arquivo ZIP (estilo Overleaf)
   */
  async createDocumentFromZip(zipBuffer: Buffer, userTitle?: string): Promise<Document> {
    const parsed = parseLatexZip(zipBuffer);
    const id = randomUUID();
    const finalTitle = userTitle?.trim() || parsed.detectedTitle || 'Artigo Importado via ZIP';

    const doc: Document = {
      id,
      title: finalTitle,
      content: parsed.rootDoc.content,
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    await this.repository.create(doc);

    // Registra a Versão 1 inicial no histórico de snapshots
    await this.repository.createSnapshot({
      id: randomUUID(),
      documentId: id,
      version: 1,
      content: parsed.rootDoc.content,
      savedBy: 'Sistema',
      reason: 'versao_inicial',
      createdAt: doc.updatedAt,
    });

    // Persiste os arquivos auxiliares (estilos .cls/.sty, bibliografia .bib, imagens e assets)
    for (const file of parsed.files) {
      if (!file.isBinary && file.content !== undefined) {
        await this.createProjectTextFile(id, file.path, file.content);
      } else if (file.isBinary && file.buffer) {
        await this.uploadProjectFile(id, file.path, file.buffer, file.mimeType);
      }
    }

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
   * Aplica e rebaseia atualizações colaborativas com @codemirror/collab
   */
  async pushUpdates(
    documentId: string,
    file: string,
    clientVersion: number,
    rawUpdates: Array<{ clientID: string; changes: unknown }>,
    userId: string,
    userName: string,
    onSnapshotSaved?: (snapshot: DocumentSnapshot) => void
  ): Promise<{
    rebasedUpdates: Array<{ clientID: string; changes: unknown }>;
    newVersion: number;
    docContent: string;
  }> {
    let active = this.activeDocs.get(documentId);
    if (!active) {
      await this.getDocument(documentId);
      active = this.activeDocs.get(documentId)!;
    }

    if (onSnapshotSaved) {
      active.onSnapshotSaved = onSnapshotSaved;
    }

    const isMain = file === 'main.tex';
    let targetDoc: Text;
    let targetUpdates: Update[];

    if (isMain) {
      targetDoc = active.doc;
      targetUpdates = active.updates;
    } else {
      let fileCollab = active.filesCollab.get(file);
      if (!fileCollab) {
        const projectFiles = await this.listProjectFiles(documentId);
        const targetFileObj = projectFiles.find((f) => f.path === file);
        const initialContent = targetFileObj?.content || '';
        fileCollab = {
          doc: Text.of(initialContent.split('\n')),
          version: 0,
          updates: [],
        };
        active.filesCollab.set(file, fileCollab);
      }
      targetDoc = fileCollab.doc;
      targetUpdates = fileCollab.updates;
    }
    if (!rawUpdates.length) {
      return {
        rebasedUpdates: [],
        newVersion: targetUpdates.length,
        docContent: targetDoc.toString(),
      };
    }


    let received: Update[] = rawUpdates.map((u) => ({
      clientID: u.clientID,
      changes: ChangeSet.fromJSON(u.changes),
    }));

    // Rebase se o cliente estiver defasado em relação à versão canônica do servidor
    if (clientVersion < targetUpdates.length) {
      const historicalUpdates = targetUpdates.slice(clientVersion);
      received = [...rebaseUpdates(received, historicalUpdates)];
    }

    const comments = this.commentsMap.get(documentId);
    for (const update of received) {
      targetUpdates.push(update);
      targetDoc = update.changes.apply(targetDoc);
      active.pendingOps++;
      active.lastAuthor = userName;

      if (isMain && comments) {
        for (const comment of comments) {
          if (comment.file === file) {
            comment.from = update.changes.mapPos(comment.from, 1);
            comment.to = update.changes.mapPos(comment.to, -1);
          }
        }
      }
    }

    let finalContent = '';
    if (isMain) {
      active.doc = targetDoc;
      finalContent = targetDoc.toString();
      active.content = finalContent;
    } else {
      const fileCollab = active.filesCollab.get(file)!;
      fileCollab.doc = targetDoc;
      fileCollab.version = targetUpdates.length;
      finalContent = targetDoc.toString();
    }

    if (redisPubClient.isOpen) {
      for (const update of received) {
        await redisPubClient.rPush(
          `collab:doc:${documentId}:ops`,
          JSON.stringify({
            clientID: update.clientID,
            changes: update.changes.toJSON(),
            userId,
            userName,
            file,
            timestamp: Date.now(),
          })
        );
      }
    }

    clearTimeout(active.debounceTimer);
    active.debounceTimer = setTimeout(async () => {
      await this.flushCheckpoint(documentId);
    }, 3000);

    return {
      rebasedUpdates: received.map((u) => ({
        clientID: u.clientID,
        changes: u.changes.toJSON(),
      })),
      newVersion: targetUpdates.length,
      docContent: finalContent,
    };
  }

  /**
   * Aplica um delta atômico no documento em tempo real (compatibilidade legada)
   */
  async applyDelta(
    documentId: string,
    delta: DeltaOperation,
    onSnapshotSaved?: (snapshot: DocumentSnapshot) => void
  ): Promise<{ operation: DocumentOperation; newContent: string; newVersion: number }> {
    let active = this.activeDocs.get(documentId);
    if (!active) {
      await this.getDocument(documentId);
      active = this.activeDocs.get(documentId)!;
    }

    const pos = Math.max(0, Math.min(delta.position, active.doc.length));
    let change: ChangeSet;
    if (delta.type === 'insert' && delta.text !== undefined) {
      change = ChangeSet.of([{ from: pos, insert: delta.text }], active.doc.length);
    } else if (delta.type === 'delete' && delta.length !== undefined) {
      const delLen = Math.min(delta.length, active.doc.length - pos);
      change = ChangeSet.of([{ from: pos, to: pos + delLen }], active.doc.length);
    } else {
      change = ChangeSet.empty(active.doc.length);
    }

    const result = await this.pushUpdates(
      documentId,
      'main.tex',
      active.updates.length,
      [{ clientID: delta.userId, changes: change.toJSON() }],
      delta.userId,
      delta.userName,
      onSnapshotSaved
    );

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

    return {
      operation: op,
      newContent: result.docContent,
      newVersion: result.newVersion,
    };
  }

  /**
   * Consolidar e salvar o Snapshot no banco de dados (Checkpoint)
   */
  async flushCheckpoint(documentId: string): Promise<DocumentSnapshot | null> {
    const active = this.activeDocs.get(documentId);
    if (!active || active.pendingOps === 0) return null;

    active.version++;
    const content = active.doc.toString();
    active.content = content;

    console.log(
      `[PostgreSQL] 💾 Persistindo Checkpoint Snapshot do documento ${documentId} (Versão ${active.version})...`
    );

    await this.repository.updateContent(documentId, content, active.version);

    for (const [filePath, fileState] of active.filesCollab.entries()) {
      try {
        const projectFiles = await this.listProjectFiles(documentId);
        const pf = projectFiles.find((f) => f.path === filePath);
        if (pf) {
          await this.repository.updateProjectFileContent(pf.id, fileState.doc.toString());
        }
      } catch (err) {
        console.error(`[Flush] Erro ao persistir arquivo secundário ${filePath}:`, err);
      }
    }

    const snapshot: DocumentSnapshot = {
      id: randomUUID(),
      documentId,
      version: active.version,
      content,
      savedBy: active.lastAuthor,
      reason: `checkpoint_${active.pendingOps}_operacoes`,
      createdAt: new Date().toISOString(),
    };

    await this.repository.createSnapshot(snapshot);
    active.pendingOps = 0;
    active.debounceTimer = undefined;

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

    // 1. Salva o blob no bucket MinIO
    await uploadToMinio(storageKey, buffer, mimeType);

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
  async getProjectFileRaw(
    fileId: string
  ): Promise<{ buffer: Buffer; mimeType: string; path: string }> {
    const file = await this.repository.findProjectFileById(fileId);
    if (!file || !file.storageKey) {
      throw new Error(`Arquivo ${fileId} não encontrado`);
    }

    const { buffer, contentType } = await getFromMinio(file.storageKey);
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
      mimeType:
        fileType === 'tex' ? 'text/x-tex' : fileType === 'bib' ? 'text/plain' : 'text/plain',
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
        await deleteFromMinio(file.storageKey);
      } catch (err) {
        console.warn(`[MinIO] Falha ao deletar objeto ${file.storageKey}:`, err);
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
          url: getInternalMinioUrl(file.storageKey),
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
      throw new Error(
        errorJson.details || errorJson.error || `Erro de compilação (${response.status})`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Obtém a lista de comentários de revisão do documento
   */
  getComments(documentId: string): ReviewComment[] {
    return this.commentsMap.get(documentId) || [];
  }

  /**
   * Cria um novo comentário de revisão sobre um trecho selecionado
   */
  addComment(documentId: string, comment: ReviewComment): ReviewComment {
    const list = this.commentsMap.get(documentId) || [];
    list.unshift(comment);
    this.commentsMap.set(documentId, list);
    return comment;
  }

  /**
   * Adiciona uma resposta a uma thread de comentário existente
   */
  replyComment(documentId: string, commentId: string, reply: CommentReply): ReviewComment | null {
    const list = this.commentsMap.get(documentId) || [];
    const comm = list.find((c) => c.id === commentId);
    if (!comm) return null;
    comm.replies.push(reply);
    return comm;
  }

  /**
   * Altera o status do comentário (open vs resolved)
   */
  resolveComment(
    documentId: string,
    commentId: string,
    status: 'open' | 'resolved'
  ): ReviewComment | null {
    const list = this.commentsMap.get(documentId) || [];
    const comm = list.find((c) => c.id === commentId);
    if (!comm) return null;
    comm.status = status;
    return comm;
  }

  /**
   * Remove um comentário
   */
  deleteComment(documentId: string, commentId: string): boolean {
    const list = this.commentsMap.get(documentId) || [];
    const filtered = list.filter((c) => c.id !== commentId);
    this.commentsMap.set(documentId, filtered);
    return filtered.length !== list.length;
  }

  /**
   * Ajusta os índices de início (from) e fim (to) dos comentários quando um delta é aplicado
   */
  adjustCommentPositions(documentId: string, file: string, delta: DeltaOperation): void {
    const list = this.commentsMap.get(documentId);
    if (!list) return;

    for (const comment of list) {
      if (comment.file !== file) continue;

      if (delta.type === 'insert' && delta.text) {
        const len = delta.text.length;
        if (delta.position <= comment.from) {
          comment.from += len;
          comment.to += len;
        } else if (delta.position > comment.from && delta.position < comment.to) {
          comment.to += len;
        }
      } else if (delta.type === 'delete' && delta.length) {
        const len = delta.length;
        if (delta.position + len <= comment.from) {
          comment.from -= len;
          comment.to -= len;
        } else if (delta.position < comment.to && delta.position + len > comment.from) {
          comment.from = Math.min(comment.from, delta.position);
          comment.to = Math.max(comment.from, comment.to - len);
        }
      }
    }
  }
}

export const defaultDocumentsService = new DocumentsService();

