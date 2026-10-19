import { FastifyReply, FastifyRequest } from 'fastify';
import {
  LanguageToolService,
  defaultLanguageToolService,
} from './languagetool.service.js';
import { CheckTextBody } from './languagetool.schema.js';

export class LanguageToolController {
  constructor(
    private readonly service: LanguageToolService = defaultLanguageToolService
  ) {}

  async check(
    request: FastifyRequest<{ Body: CheckTextBody }>,
    reply: FastifyReply
  ) {
    const result = await this.service.checkText(request.body);
    return reply.status(200).send(result);
  }

  async status(_request: FastifyRequest, reply: FastifyReply) {
    const status = await this.service.getStatus();
    return reply.status(200).send(status);
  }
}
