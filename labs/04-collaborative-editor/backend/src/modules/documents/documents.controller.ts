import { FastifyReply, FastifyRequest } from 'fastify';
import { DocumentsService, defaultDocumentsService } from './documents.service.js';

export class DocumentsController {
  constructor(private service: DocumentsService = defaultDocumentsService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const docs = await this.service.listDocuments();
    return reply.status(200).send(docs);
  }

  async getById(request: FastifyRequest<{ Params: { documentId: string } }>, reply: FastifyReply) {
    const { documentId } = request.params;
    try {
      const doc = await this.service.getDocument(documentId);
      return reply.status(200).send(doc);
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(404).send({ error: error.message });
    }
  }

  async create(
    request: FastifyRequest<{
      Body: { title: string; templateId?: string; initialContent?: string };
    }>,
    reply: FastifyReply
  ) {
    const { title, templateId, initialContent } = request.body;
    const doc = await this.service.createDocument(title, templateId, initialContent);
    return reply.status(201).send(doc);
  }

  async createFromZip(request: FastifyRequest, reply: FastifyReply) {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo ZIP enviado no formulário multipart' });
    }

    const isZip =
      data.filename.toLowerCase().endsWith('.zip') ||
      data.mimetype === 'application/zip' ||
      data.mimetype === 'application/x-zip-compressed';

    if (!isZip) {
      return reply.status(400).send({ error: 'O arquivo enviado deve ter a extensão .zip' });
    }

    const buffer = await data.toBuffer();
    const fields = data.fields as Record<string, { value?: string } | undefined>;
    const userTitle = fields.title?.value;

    try {
      const doc = await this.service.createDocumentFromZip(buffer, userTitle);
      return reply.status(201).send(doc);
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(400).send({ error: error.message });
    }
  }

  async getHistory(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const { documentId } = request.params;
    const history = await this.service.getHistory(documentId);
    return reply.status(200).send(history);
  }

  async flush(request: FastifyRequest<{ Params: { documentId: string } }>, reply: FastifyReply) {
    const { documentId } = request.params;
    const snapshot = await this.service.flushCheckpoint(documentId);
    return reply.status(200).send({
      message: snapshot ? 'Snapshot persistido com sucesso' : 'Nenhuma alteração pendente',
      snapshot,
    });
  }

  async compile(request: FastifyRequest<{ Params: { documentId: string } }>, reply: FastifyReply) {
    const { documentId } = request.params;
    try {
      const pdfBuffer = await this.service.compileDocument(documentId);
      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `inline; filename="${documentId}.pdf"`)
        .header('Content-Length', pdfBuffer.length)
        .send(pdfBuffer);
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(422).send({
        error: error.message,
      });
    }
  }

  async listFiles(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const { documentId } = request.params;
    const files = await this.service.listProjectFiles(documentId);
    return reply.status(200).send(files);
  }

  async uploadFile(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const { documentId } = request.params;
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo enviado no formulário multipart' });
    }

    const buffer = await data.toBuffer();
    const customPath = (data.fields as Record<string, { value?: string }>).path?.value;
    const filePath = customPath || data.filename;

    try {
      const projectFile = await this.service.uploadProjectFile(
        documentId,
        filePath,
        buffer,
        data.mimetype
      );
      return reply.status(201).send(projectFile);
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(500).send({ error: `Erro no upload: ${error.message}` });
    }
  }

  async getFileRaw(
    request: FastifyRequest<{ Params: { documentId: string; fileId: string } }>,
    reply: FastifyReply
  ) {
    const { fileId } = request.params;
    try {
      const { buffer, mimeType, path } = await this.service.getProjectFileRaw(fileId);
      const filename = path.split('/').pop() || 'file';
      return reply
        .header('Content-Type', mimeType)
        .header('Content-Disposition', `inline; filename="${filename}"`)
        .send(buffer);
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(404).send({ error: error.message });
    }
  }

  async deleteFile(
    request: FastifyRequest<{ Params: { documentId: string; fileId: string } }>,
    reply: FastifyReply
  ) {
    const { fileId } = request.params;
    try {
      await this.service.deleteProjectFile(fileId);
      return reply.status(200).send({ message: 'Arquivo excluído com sucesso' });
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(500).send({ error: error.message });
    }
  }

  async createFile(
    request: FastifyRequest<{
      Params: { documentId: string };
      Body: { path: string; content?: string };
    }>,
    reply: FastifyReply
  ) {
    const { documentId } = request.params;
    const { path, content = '' } = request.body;
    try {
      const file = await this.service.createProjectTextFile(documentId, path, content);
      return reply.status(201).send(file);
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(500).send({ error: error.message });
    }
  }

  async getFileContent(
    request: FastifyRequest<{ Params: { documentId: string; fileId: string } }>,
    reply: FastifyReply
  ) {
    const { fileId } = request.params;
    const files = await this.service.listProjectFiles(request.params.documentId);
    const file = files.find((f) => f.id === fileId);
    if (!file) {
      return reply.status(404).send({ error: 'Arquivo não encontrado' });
    }
    return reply.status(200).send({
      id: file.id,
      path: file.path,
      content: file.content || '',
    });
  }

  async updateFileContent(
    request: FastifyRequest<{
      Params: { documentId: string; fileId: string };
      Body: { content: string };
    }>,
    reply: FastifyReply
  ) {
    const { fileId } = request.params;
    const { content } = request.body;
    try {
      const file = await this.service.updateProjectFileContent(fileId, content);
      return reply.status(200).send(file);
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(500).send({ error: error.message });
    }
  }
}
