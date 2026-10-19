import {
  CheckTextBody,
  CheckTextResponse,
  LanguageToolMatch,
  LanguageToolStatusResponse,
} from './languagetool.schema.js';

export class LanguageToolService {
  constructor(
    private readonly endpointUrl: string = process.env.LANGUAGETOOL_URL || 'http://localhost:8081/v2/check'
  ) {}

  /**
   * Envia o texto para a API do LanguageTool Server (local ou auto-hospedado)
   * Realiza verificação ortográfica e gramatical sem vazamento de dados.
   * Se o serviço estiver temporariamente indisponível, retorna status gracioso sem quebrar o editor.
   */
  async checkText(payload: CheckTextBody): Promise<CheckTextResponse> {
    const { text, language } = payload;
    if (!text || !text.trim()) {
      return { matches: [], status: 'ok' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const params = new URLSearchParams({
        text,
        language: language || 'pt-BR',
        enabledOnly: 'false',
      });

      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          matches: [],
          status: 'unavailable',
          message: `LanguageTool retornou HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as { matches?: LanguageToolMatch[] };
      return {
        matches: Array.isArray(data.matches) ? data.matches : [],
        status: 'ok',
      };
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      return {
        matches: [],
        status: 'unavailable',
        message: `Servidor LanguageTool offline ou inacessível (${errMessage})`,
      };
    }
  }

  /**
   * Verifica a conectividade e saúde da instância do LanguageTool
   */
  async getStatus(): Promise<LanguageToolStatusResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // LanguageTool possui endpoint /v2/languages para status rápido
      const baseUrl = this.endpointUrl.replace(/\/v2\/check$/, '');
      const response = await fetch(`${baseUrl}/v2/languages`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { status: 'ok', endpoint: this.endpointUrl };
      }
      return { status: 'unavailable', endpoint: this.endpointUrl };
    } catch {
      return { status: 'unavailable', endpoint: this.endpointUrl };
    }
  }
}

export const defaultLanguageToolService = new LanguageToolService();
