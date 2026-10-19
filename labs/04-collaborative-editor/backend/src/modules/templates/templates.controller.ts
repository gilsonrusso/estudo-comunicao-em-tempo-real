import { FastifyReply, FastifyRequest } from 'fastify';
import { TemplatesService, defaultTemplatesService } from './templates.service.js';
import { CreateTemplateBody } from './templates.schema.js';

export class TemplatesController {
  constructor(private service: TemplatesService = defaultTemplatesService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const templates = await this.service.listTemplates();
    return reply.status(200).send(templates);
  }

  async getById(request: FastifyRequest<{ Params: { templateId: string } }>, reply: FastifyReply) {
    const { templateId } = request.params;
    const template = await this.service.getTemplateById(templateId);
    if (!template) {
      return reply.status(404).send({ error: `Template ${templateId} não encontrado` });
    }
    return reply.status(200).send(template);
  }

  async create(request: FastifyRequest<{ Body: CreateTemplateBody }>, reply: FastifyReply) {
    const created = await this.service.createCustomTemplate(request.body);
    return reply.status(201).send(created);
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
    const name = fields.name?.value;
    const description = fields.description?.value;
    const category = fields.category?.value || 'custom';

    try {
      const template = await this.service.createTemplateFromZip(buffer, name, description, category);
      return reply.status(201).send(template);
    } catch (err: unknown) {
      const error = err as Error;
      return reply.status(400).send({ error: error.message });
    }
  }
}
