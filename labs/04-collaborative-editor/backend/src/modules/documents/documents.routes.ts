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
  UpdateFileContentBodySchema,
  CreateFileBodySchema,
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

  // Criar documento a partir de upload de arquivo ZIP (estilo Overleaf)
  fastify.post(
    '/api/documents/upload-zip',
    {
      schema: {
        tags: ['Documents'],
        summary: 'Criar novo artigo a partir do upload de pacote .zip (estilo Overleaf)',
        response: {
          201: DocumentSchema,
          400: z.object({ error: z.string() }),
        },
      },
    },
    controller.createFromZip.bind(controller)
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

  // Criar novo arquivo de texto (ex: .bib, .tex, .sty)
  fastify.post(
    '/api/documents/:documentId/files/create',
    {
      schema: {
        tags: ['Documents', 'Files'],
        summary: 'Criar novo arquivo de texto no projeto',
        params: GetDocumentParamsSchema,
        body: CreateFileBodySchema,
        response: {
          201: ProjectFileSchema,
        },
      },
    },
    controller.createFile.bind(controller)
  );

  // Obter conteúdo textual de um arquivo (.bib, .tex, .sty)
  fastify.get(
    '/api/documents/:documentId/files/:fileId/content',
    {
      schema: {
        tags: ['Documents', 'Files'],
        summary: 'Obter conteúdo textual do arquivo',
        params: FileParamsSchema,
      },
    },
    controller.getFileContent.bind(controller)
  );

  // Atualizar conteúdo textual de um arquivo (.bib, .tex, .sty)
  fastify.put(
    '/api/documents/:documentId/files/:fileId/content',
    {
      schema: {
        tags: ['Documents', 'Files'],
        summary: 'Atualizar conteúdo textual do arquivo',
        params: FileParamsSchema,
        body: UpdateFileContentBodySchema,
        response: {
          200: ProjectFileSchema,
        },
      },
    },
    controller.updateFileContent.bind(controller)
  );
};
