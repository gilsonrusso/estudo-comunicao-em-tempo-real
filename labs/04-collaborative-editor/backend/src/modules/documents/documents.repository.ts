import pg from 'pg';
import { Document, DocumentOperation, DocumentSnapshot, ProjectFile } from './documents.schema.js';

const { Pool } = pg;

export interface IDocumentsRepository {
  findById(id: string): Promise<Document | null>;
  findAll(): Promise<Document[]>;
  create(doc: Document): Promise<Document>;
  updateContent(id: string, content: string, version: number): Promise<Document>;
  appendOperation(op: DocumentOperation): Promise<DocumentOperation>;
  getOperations(documentId: string): Promise<DocumentOperation[]>;
  createSnapshot(snapshot: DocumentSnapshot): Promise<DocumentSnapshot>;
  getSnapshots(documentId: string): Promise<DocumentSnapshot[]>;
  listProjectFiles(documentId: string): Promise<ProjectFile[]>;
  findProjectFileById(fileId: string): Promise<ProjectFile | null>;
  saveProjectFile(file: ProjectFile): Promise<ProjectFile>;
  updateProjectFileContent(fileId: string, content: string): Promise<ProjectFile>;
  deleteProjectFile(fileId: string): Promise<void>;
}

export class PostgresDocumentsRepository implements IDocumentsRepository {
  private pool: pg.Pool;

  constructor(connectionString?: string) {
    const url =
      connectionString ||
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/collab_db';
    this.pool = new Pool({ connectionString: url });

    this.pool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]:', err.message);
    });
  }

  async findById(id: string): Promise<Document | null> {
    const res = await this.pool.query(
      `SELECT id, title, content, version, updated_at as "updatedAt" FROM documents WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  async findAll(): Promise<Document[]> {
    const res = await this.pool.query(
      `SELECT id, title, content, version, updated_at as "updatedAt" FROM documents ORDER BY updated_at DESC`
    );
    return res.rows.map((row) => ({
      ...row,
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  }

  async create(doc: Document): Promise<Document> {
    await this.pool.query(
      `INSERT INTO documents (id, title, content, version, updated_at) VALUES ($1, $2, $3, $4, $5)`,
      [doc.id, doc.title, doc.content, doc.version, doc.updatedAt]
    );
    return doc;
  }

  async updateContent(id: string, content: string, version: number): Promise<Document> {
    const res = await this.pool.query(
      `UPDATE documents SET content = $1, version = $2, updated_at = NOW() WHERE id = $3 RETURNING id, title, content, version, updated_at as "updatedAt"`,
      [content, version, id]
    );
    if (res.rows.length === 0) throw new Error(`Documento ${id} não encontrado`);
    const row = res.rows[0];
    return {
      ...row,
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  async appendOperation(op: DocumentOperation): Promise<DocumentOperation> {
    await this.pool.query(
      `INSERT INTO document_operations (id, document_id, user_id, user_name, type, position, text, length, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        op.id,
        op.documentId,
        op.userId,
        op.userName,
        op.type,
        op.position,
        op.text || null,
        op.length || null,
        op.timestamp,
      ]
    );
    return op;
  }

  async getOperations(documentId: string): Promise<DocumentOperation[]> {
    const res = await this.pool.query(
      `SELECT id, document_id as "documentId", user_id as "userId", user_name as "userName", type, position, text, length, timestamp
       FROM document_operations WHERE document_id = $1 ORDER BY timestamp DESC LIMIT 50`,
      [documentId]
    );
    return res.rows.map((row) => ({
      ...row,
      text: row.text || undefined,
      length: row.length || undefined,
      timestamp: Number(row.timestamp),
    }));
  }

  async createSnapshot(snapshot: DocumentSnapshot): Promise<DocumentSnapshot> {
    await this.pool.query(
      `INSERT INTO document_snapshots (id, document_id, version, content, saved_by, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        snapshot.id,
        snapshot.documentId,
        snapshot.version,
        snapshot.content,
        snapshot.savedBy,
        snapshot.reason,
        snapshot.createdAt,
      ]
    );
    return snapshot;
  }

  async getSnapshots(documentId: string): Promise<DocumentSnapshot[]> {
    const res = await this.pool.query(
      `SELECT id, document_id as "documentId", version, content, saved_by as "savedBy", reason, created_at as "createdAt"
       FROM document_snapshots WHERE document_id = $1 ORDER BY version DESC`,
      [documentId]
    );
    return res.rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }

  async listProjectFiles(documentId: string): Promise<ProjectFile[]> {
    const res = await this.pool.query(
      `SELECT id, document_id as "documentId", path, file_type as "fileType", mime_type as "mimeType",
              size_bytes as "sizeBytes", storage_key as "storageKey", content, created_at as "createdAt"
       FROM project_files WHERE document_id = $1 ORDER BY path ASC`,
      [documentId]
    );
    return res.rows.map((row) => ({
      ...row,
      content: row.content || null,
      sizeBytes: Number(row.sizeBytes),
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }

  async findProjectFileById(fileId: string): Promise<ProjectFile | null> {
    const res = await this.pool.query(
      `SELECT id, document_id as "documentId", path, file_type as "fileType", mime_type as "mimeType",
              size_bytes as "sizeBytes", storage_key as "storageKey", content, created_at as "createdAt"
       FROM project_files WHERE id = $1`,
      [fileId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      content: row.content || null,
      sizeBytes: Number(row.sizeBytes),
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }

  async saveProjectFile(file: ProjectFile): Promise<ProjectFile> {
    await this.pool.query(
      `INSERT INTO project_files (id, document_id, path, file_type, mime_type, size_bytes, storage_key, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (document_id, path) DO UPDATE SET
         file_type = EXCLUDED.file_type,
         mime_type = EXCLUDED.mime_type,
         size_bytes = EXCLUDED.size_bytes,
         storage_key = EXCLUDED.storage_key,
         content = EXCLUDED.content`,
      [
        file.id,
        file.documentId,
        file.path,
        file.fileType,
        file.mimeType,
        file.sizeBytes,
        file.storageKey,
        file.content || null,
        file.createdAt,
      ]
    );
    return file;
  }

  async updateProjectFileContent(fileId: string, content: string): Promise<ProjectFile> {
    const res = await this.pool.query(
      `UPDATE project_files
       SET content = $1, size_bytes = length($1)
       WHERE id = $2
       RETURNING id, document_id as "documentId", path, file_type as "fileType", mime_type as "mimeType",
                 size_bytes as "sizeBytes", storage_key as "storageKey", content, created_at as "createdAt"`,
      [content, fileId]
    );
    if (res.rows.length === 0) throw new Error(`Arquivo ${fileId} não encontrado`);
    const row = res.rows[0];
    return {
      ...row,
      sizeBytes: Number(row.sizeBytes),
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }

  async deleteProjectFile(fileId: string): Promise<void> {
    await this.pool.query(`DELETE FROM project_files WHERE id = $1`, [fileId]);
  }
}
