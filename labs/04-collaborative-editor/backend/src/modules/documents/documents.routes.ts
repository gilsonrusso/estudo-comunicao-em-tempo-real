import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { DocumentsController } from './documents.controller.js';
import {
  CreateDocumentBodySchema,
  DocumentSchema,
  DocumentSnapshotSchema,
  DocumentOperationSchema,
  GetDocumentParamsSchema,
  ProjectFileSchema,
  FileParamsSchema,
} from './documents.schema.js';

export const documentsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const controller = new DocumentsController();

  // Listar todos os documentos
  fastify.get(
    '/api/documents',
    {
      schema: {
        tags: ['Documents'],
        summary: 'Listar documentos',
        response: {
          200: z.array(DocumentSchema),
        },
      },
    },
    controller.list.bind(controller)
  );

  // Criar documento
  fastify.post(
    '/api/documents',
    {
      schema: {
        tags: ['Documents'],
        summary: 'Criar novo documento',
        body: CreateDocumentBodySchema,
        response: {
          201: DocumentSchema,
        },
      },
    },
    controller.create.bind(controller)
  );

  // Obter documento por ID
  fastify.get(
    '/api/documents/:documentId',
    {
      schema: {
        tags: ['Documents'],
        summary: 'Obter documento por ID',
        params: GetDocumentParamsSchema,
        response: {
          200: DocumentSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    controller.getById.bind(controller)
  );

  // Obter histórico de snapshots e operações
  fastify.get(
    '/api/documents/:documentId/history',
    {
      schema: {
        tags: ['Documents'],
        summary: 'Obter histórico de snapshots e log de operações do documento',
        params: GetDocumentParamsSchema,
        response: {
          200: z.object({
            snapshots: z.array(DocumentSnapshotSchema),
            operations: z.array(DocumentOperationSchema),
          }),
        },
      },
    },
    controller.getHistory.bind(controller)
  );

  // Forçar gravação de snapshot imediato (flush manual)
  fastify.post(
    '/api/documents/:documentId/flush',
    {
      schema: {
        tags: ['Documents'],
        summary: 'Forçar gravação de snapshot no banco de dados',
        params: GetDocumentParamsSchema,
        response: {
          200: z.object({
            message: z.string(),
            snapshot: DocumentSnapshotSchema.nullable(),
          }),
        },
      },
    },
    controller.flush.bind(controller)
  );

  // Compilar documento LaTeX para PDF via micro-serviço TeX Live
  fastify.post(
    '/api/documents/:documentId/compile',
    {
      schema: {
        tags: ['Documents'],
        summary: 'Compilar documento LaTeX para PDF via micro-serviço TeX Live',
        params: GetDocumentParamsSchema,
      },
    },
    controller.compile.bind(controller)
  );

  // Listar arquivos do projeto
  fastify.get(
    '/api/documents/:documentId/files',
    {
      schema: {
        tags: ['Documents', 'Files'],
        summary: 'Listar arquivos do projeto LaTeX',
        params: GetDocumentParamsSchema,
        response: {
          200: z.array(ProjectFileSchema),
        },
      },
    },
    controller.listFiles.bind(controller)
  );

  // Upload de arquivo / imagem (multipart)
  fastify.post(
    '/api/documents/:documentId/files/upload',
    {
      schema: {
        tags: ['Documents', 'Files'],
        summary: 'Fazer upload de arquivo ou imagem para o MinIO',
        params: GetDocumentParamsSchema,
      },
    },
    controller.uploadFile.bind(controller)
  );

  // Obter stream binário da imagem/arquivo
  fastify.get(
    '/api/documents/:documentId/files/:fileId/raw',
    {
      schema: {
        tags: ['Documents', 'Files'],
        summary: 'Obter stream binário do arquivo',
        params: FileParamsSchema,
      },
    },
    controller.getFileRaw.bind(controller)
  );

  // Deletar arquivo do projeto
  fastify.delete(
    '/api/documents/:documentId/files/:fileId',
    {
      schema: {
        tags: ['Documents', 'Files'],
        summary: 'Excluir arquivo do projeto',
        params: FileParamsSchema,
        response: {
          200: z.object({ message: z.string() }),
        },
      },
    },
    controller.deleteFile.bind(controller)
  );
};
