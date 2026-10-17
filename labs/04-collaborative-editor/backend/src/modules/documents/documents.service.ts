import { randomUUID } from 'crypto';
import {
  Document,
  DeltaOperation,
  DocumentOperation,
  DocumentSnapshot,
} from './documents.schema.js';
import {
  IDocumentsRepository,
  PostgresDocumentsRepository,
} from './documents.repository.js';
import { redisPubClient } from '../../infra/redis.js';

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
   * Delega a compilação do conteúdo atual do documento para o micro-serviço TeX Live
   */
  async compileDocument(documentId: string): Promise<Buffer> {
    const doc = await this.getDocument(documentId);
    const compilerUrl = process.env.COMPILER_URL || 'http://compiler:4000';

    const response = await fetch(`${compilerUrl}/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: doc.content,
        documentId,
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
