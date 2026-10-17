import { FastifyReply, FastifyRequest } from 'fastify';
import { DocumentsService } from './documents.service.js';

export class DocumentsController {
  constructor(
    private service: DocumentsService = new DocumentsService()
  ) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const docs = await this.service.listDocuments();
    return reply.status(200).send(docs);
  }

  async getById(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
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
    request: FastifyRequest<{ Body: { title: string; initialContent?: string } }>,
    reply: FastifyReply
  ) {
    const { title, initialContent } = request.body;
    const doc = await this.service.createDocument(title, initialContent);
    return reply.status(201).send(doc);
  }

  async getHistory(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const { documentId } = request.params;
    const history = await this.service.getHistory(documentId);
    return reply.status(200).send(history);
  }

  async flush(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const { documentId } = request.params;
    const snapshot = await this.service.flushCheckpoint(documentId);
    return reply.status(200).send({
      message: snapshot ? 'Snapshot persistido com sucesso' : 'Nenhuma alteração pendente',
      snapshot,
    });
  }

  async compile(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
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
}
