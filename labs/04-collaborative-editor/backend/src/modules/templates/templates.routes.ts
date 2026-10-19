import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { TemplatesController } from './templates.controller.js';
import {
  TemplateSchema,
  TemplateDetailSchema,
  GetTemplateParamsSchema,
  CreateTemplateBodySchema,
} from './templates.schema.js';

export const templatesRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const controller = new TemplatesController();

  // Listar todos os templates disponíveis
  fastify.get(
    '/api/templates',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Listar todos os templates LaTeX disponíveis',
        response: {
          200: z.array(TemplateSchema),
        },
      },
    },
    controller.list.bind(controller)
  );

  // Obter detalhes de um template (com arquivos e .cls)
  fastify.get(
    '/api/templates/:templateId',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Obter detalhes de um template com arquivos associados',
        params: GetTemplateParamsSchema,
        response: {
          200: TemplateDetailSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    controller.getById.bind(controller)
  );

  // Criar ou fazer upload de novo template customizado
  fastify.post(
    '/api/templates',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Criar ou registrar novo template LaTeX customizado',
        body: CreateTemplateBodySchema,
        response: {
          201: TemplateDetailSchema,
        },
      },
    },
    controller.create.bind(controller)
  );

  // Upload de pacote ZIP como novo template
  fastify.post(
    '/api/templates/upload-zip',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Registrar novo modelo LaTeX a partir de arquivo .zip',
        response: {
          201: TemplateDetailSchema,
          400: z.object({ error: z.string() }),
        },
      },
    },
    controller.createFromZip.bind(controller)
  );
};
