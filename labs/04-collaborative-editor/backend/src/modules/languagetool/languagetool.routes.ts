import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { LanguageToolController } from './languagetool.controller.js';
import {
  CheckTextBodySchema,
  CheckTextResponseSchema,
  LanguageToolStatusResponseSchema,
} from './languagetool.schema.js';

export const languageToolRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const controller = new LanguageToolController();

  // Executar verificação gramatical e ortográfica de texto
  fastify.post(
    '/api/languagetool/check',
    {
      schema: {
        tags: ['LanguageTool'],
        summary: 'Verificação ortográfica e gramatical de texto com LanguageTool',
        body: CheckTextBodySchema,
        response: {
          200: CheckTextResponseSchema,
        },
      },
    },
    controller.check.bind(controller)
  );

  // Status de conectividade com a instância do LanguageTool
  fastify.get(
    '/api/languagetool/status',
    {
      schema: {
        tags: ['LanguageTool'],
        summary: 'Verifica o status de conectividade com o LanguageTool Server',
        response: {
          200: LanguageToolStatusResponseSchema,
        },
      },
    },
    controller.status.bind(controller)
  );
};
