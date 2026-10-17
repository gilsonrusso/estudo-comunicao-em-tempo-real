import pg from 'pg';
import { Document, DocumentOperation, DocumentSnapshot } from './documents.schema.js';

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
}

export class PostgresDocumentsRepository implements IDocumentsRepository {
  private pool: pg.Pool;

  constructor(connectionString?: string) {
    const url = connectionString || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/collab_db';
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
      [op.id, op.documentId, op.userId, op.userName, op.type, op.position, op.text || null, op.length || null, op.timestamp]
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
      [snapshot.id, snapshot.documentId, snapshot.version, snapshot.content, snapshot.savedBy, snapshot.reason, snapshot.createdAt]
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
}
