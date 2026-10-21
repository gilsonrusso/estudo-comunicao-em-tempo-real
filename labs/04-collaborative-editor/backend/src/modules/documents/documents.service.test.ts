import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ChangeSet } from '@codemirror/state';
import { DocumentsService } from './documents.service.js';
import { IDocumentsRepository } from './documents.repository.js';
import { Document, DocumentOperation, DocumentSnapshot, ProjectFile } from './documents.schema.js';

class InMemoryDocumentsRepository implements IDocumentsRepository {
  private docs = new Map<string, Document>();
  private snapshots: DocumentSnapshot[] = [];
  private operations: DocumentOperation[] = [];
  private files: ProjectFile[] = [];

  async findById(id: string): Promise<Document | null> {
    const doc = this.docs.get(id);
    return doc ? { ...doc } : null;
  }

  async findAll(): Promise<Document[]> {
    return Array.from(this.docs.values());
  }

  async create(doc: Document): Promise<Document> {
    this.docs.set(doc.id, { ...doc });
    return doc;
  }

  async updateContent(id: string, content: string, version: number): Promise<Document> {
    const doc = this.docs.get(id);
    if (!doc) throw new Error(`Documento ${id} não encontrado`);
    doc.content = content;
    doc.version = version;
    return { ...doc };
  }

  async appendOperation(op: DocumentOperation): Promise<DocumentOperation> {
    this.operations.push(op);
    return op;
  }

  async getOperations(documentId: string): Promise<DocumentOperation[]> {
    return this.operations.filter((o) => o.documentId === documentId);
  }

  async createSnapshot(snapshot: DocumentSnapshot): Promise<DocumentSnapshot> {
    this.snapshots.push(snapshot);
    return snapshot;
  }

  async getSnapshots(documentId: string): Promise<DocumentSnapshot[]> {
    return this.snapshots.filter((s) => s.documentId === documentId);
  }

  async listProjectFiles(documentId: string): Promise<ProjectFile[]> {
    return this.files.filter((f) => f.documentId === documentId);
  }

  async findProjectFileById(fileId: string): Promise<ProjectFile | null> {
    const f = this.files.find((x) => x.id === fileId);
    return f ? { ...f } : null;
  }

  async saveProjectFile(file: ProjectFile): Promise<ProjectFile> {
    this.files.push(file);
    return file;
  }

  async updateProjectFileContent(fileId: string, content: string): Promise<ProjectFile> {
    const f = this.files.find((x) => x.id === fileId);
    if (!f) throw new Error('File not found');
    f.content = content;
    return f;
  }

  async deleteProjectFile(fileId: string): Promise<void> {
    this.files = this.files.filter((f) => f.id !== fileId);
  }
}

describe('DocumentsService - Motor Colaborativo com @codemirror/collab', () => {
  let repo: InMemoryDocumentsRepository;
  let service: DocumentsService;
  const initialDocContent = 'Hello World';

  beforeEach(async () => {
    repo = new InMemoryDocumentsRepository();
    await repo.create({
      id: 'doc-test-1',
      title: 'Artigo de Teste',
      content: initialDocContent,
      version: 1,
      updatedAt: new Date().toISOString(),
    });
    service = new DocumentsService(repo);
    await service.getDocument('doc-test-1');
  });

  test('deve aplicar pushUpdates sequencial e avançar a versão', async () => {
    // Insere " Beautiful" na posição 5
    const change = ChangeSet.of([{ from: 5, insert: ' Beautiful' }], initialDocContent.length);
    const result = await service.pushUpdates(
      'doc-test-1',
      'main.tex',
      0,
      [{ clientID: 'user-alice', changes: change.toJSON() }],
      'user-alice',
      'Alice'
    );

    assert.equal(result.newVersion, 1);
    assert.equal(result.docContent, 'Hello Beautiful World');
    assert.equal(service.getCollabVersion('doc-test-1', 'main.tex'), 1);

    const doc = await service.getDocument('doc-test-1');
    assert.equal(doc.content, 'Hello Beautiful World');
  });

  test('deve rebasear edições concorrentes de clientes sob latência sem corrupção de offsets', async () => {
    // Cenário: Alice e Bob começam ambos na versão 0 do documento "Hello World" (len: 11)
    // Alice insere " Amazing" na posição 5
    const aliceChange = ChangeSet.of([{ from: 5, insert: ' Amazing' }], initialDocContent.length);

    // Bob insere "!" no final (posição 11)
    const bobChange = ChangeSet.of([{ from: 11, insert: '!' }], initialDocContent.length);

    // 1. Operação de Alice chega ao servidor primeiro
    const aliceResult = await service.pushUpdates(
      'doc-test-1',
      'main.tex',
      0,
      [{ clientID: 'alice', changes: aliceChange.toJSON() }],
      'alice',
      'Alice'
    );
    assert.equal(aliceResult.docContent, 'Hello Amazing World');
    assert.equal(aliceResult.newVersion, 1);

    // 2. Operação de Bob chega atrasada, declarando baseVersion = 0
    // O servidor DEVE rebasear a inserção de Bob sobre a inserção de Alice
    const bobResult = await service.pushUpdates(
      'doc-test-1',
      'main.tex',
      0, // Bob ainda não tinha visto a versão 1 de Alice
      [{ clientID: 'bob', changes: bobChange.toJSON() }],
      'bob',
      'Bob'
    );

    assert.equal(bobResult.newVersion, 2);
    // Convergência matemática: o '!' de Bob deve ser transposto para após 'World'
    assert.equal(bobResult.docContent, 'Hello Amazing World!');

    const doc = await service.getDocument('doc-test-1');
    assert.equal(doc.content, 'Hello Amazing World!');
  });

  test('deve ajustar posições de comentários inline quando texto é inserido antes deles', async () => {
    service.addComment('doc-test-1', {
      id: 'comm-test',
      documentId: 'doc-test-1',
      file: 'main.tex',
      from: 6,
      to: 11,
      selectedText: 'World',
      userId: 'rev-1',
      userName: 'Revisor',
      userColor: '#888',
      content: 'Comentário sobre World',
      status: 'open',
      createdAt: '12:00',
      replies: [],
    });

    // Insere "Big " (4 caracteres) na posição 0
    const change = ChangeSet.of([{ from: 0, insert: 'Big ' }], initialDocContent.length);
    await service.pushUpdates(
      'doc-test-1',
      'main.tex',
      0,
      [{ clientID: 'user-1', changes: change.toJSON() }],
      'user-1',
      'User 1'
    );

    const comments = service.getComments('doc-test-1');
    const comment = comments.find((c) => c.id === 'comm-test');
    assert.ok(comment);
    // Posições originais 6..11 devem ter sido deslocadas em +4 => 10..15
    assert.equal(comment.from, 10);
    assert.equal(comment.to, 15);
  });

  test('flushCheckpoint deve persistir conteúdo no repositório e criar snapshot', async () => {
    const change = ChangeSet.of([{ from: 11, insert: '!' }], initialDocContent.length);
    await service.pushUpdates(
      'doc-test-1',
      'main.tex',
      0,
      [{ clientID: 'user-1', changes: change.toJSON() }],
      'user-1',
      'User 1'
    );

    const snapshot = await service.flushCheckpoint('doc-test-1');
    assert.ok(snapshot);
    assert.equal(snapshot.content, 'Hello World!');

    const repoSnapshots = await repo.getSnapshots('doc-test-1');
    assert.equal(repoSnapshots.length, 1);
    assert.equal(repoSnapshots[0].content, 'Hello World!');
  });
});
