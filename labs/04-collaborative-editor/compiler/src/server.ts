import Fastify from 'fastify';
import cors from '@fastify/cors';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';

const fastify = Fastify({
  logger: {
    level: 'info',
  },
});

await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST'],
});

fastify.get('/health', async () => {
  return {
    status: 'healthy',
    service: 'latex-compiler-worker',
    timestamp: new Date().toISOString(),
  };
});

interface CompileRequestBody {
  content: string;
  documentId?: string;
}

fastify.post<{ Body: CompileRequestBody }>('/compile', async (request, reply) => {
  const { content, documentId = 'doc' } = request.body || {};

  if (!content || typeof content !== 'string') {
    return reply.status(400).send({
      success: false,
      error: 'O corpo da requisição deve conter a propriedade "content" com o código LaTeX.',
    });
  }

  const jobId = crypto.randomUUID();
  const sandboxDir = path.join(os.tmpdir(), `tex-sandbox-${jobId}`);

  try {
    // 1. Cria diretório efêmero isolado para esta compilação
    await fs.mkdir(sandboxDir, { recursive: true });
    const texPath = path.join(sandboxDir, 'main.tex');
    await fs.writeFile(texPath, content, 'utf-8');

    request.log.info({ jobId, documentId }, 'Iniciando compilação LaTeX em sandbox');

    // 2. Executa pdflatex com proteções de segurança
    // -no-shell-escape: Bloqueia comandos do terminal (\write18)
    // -interaction=nonstopmode: Não pausa solicitando entrada interativa no terminal
    const compileResult = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
      (resolve) => {
        let stdout = '';
        let stderr = '';

        const child = spawn(
          'pdflatex',
          [
            '-interaction=nonstopmode',
            '-no-shell-escape',
            `-output-directory=${sandboxDir}`,
            texPath,
          ],
          {
            timeout: 25000, // Timeout rígido de 25 segundos
            cwd: sandboxDir,
          }
        );

        child.stdout.on('data', (chunk) => {
          stdout += chunk.toString();
        });

        child.stderr.on('data', (chunk) => {
          stderr += chunk.toString();
        });

        child.on('close', (code) => {
          resolve({ exitCode: code ?? 1, stdout, stderr });
        });

        child.on('error', (err) => {
          stderr += `\nErro ao disparar processo: ${err.message}`;
          resolve({ exitCode: 1, stdout, stderr });
        });
      }
    );

    const pdfPath = path.join(sandboxDir, 'main.pdf');
    const logPath = path.join(sandboxDir, 'main.log');

    let pdfExists = false;
    try {
      await fs.access(pdfPath);
      pdfExists = true;
    } catch {
      pdfExists = false;
    }

    if (pdfExists) {
      const pdfBuffer = await fs.readFile(pdfPath);
      request.log.info({ jobId, size: pdfBuffer.length }, 'Compilação concluída com sucesso');

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `inline; filename="${documentId}.pdf"`)
        .header('Content-Length', pdfBuffer.length)
        .send(pdfBuffer);
    } else {
      // Se não gerou PDF, extrai trecho do log de erro do LaTeX
      let logContent = compileResult.stdout;
      try {
        logContent = await fs.readFile(logPath, 'utf-8');
      } catch {
        // Usa stdout se log não estiver disponível
      }

      // Filtra linhas de erro iniciadas com "!"
      const errorLines = logContent
        .split('\n')
        .filter((line) => line.startsWith('!') || line.includes('Error:') || line.includes('Fatal error'))
        .slice(0, 10);

      request.log.warn({ jobId, errorLines }, 'Falha na compilação do LaTeX');

      return reply.status(422).send({
        success: false,
        error: 'Erro de compilação do documento LaTeX',
        details: errorLines.length > 0 ? errorLines.join('\n') : logContent.slice(-1500),
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno no compilador';
    request.log.error({ jobId, err }, 'Erro inesperado no worker de compilação');
    return reply.status(500).send({
      success: false,
      error: message,
    });
  } finally {
    // 3. Limpeza obrigatória do diretório efêmero no disco
    try {
      await fs.rm(sandboxDir, { recursive: true, force: true });
    } catch {
      // Ignora falhas na limpeza temporária
    }
  }
});

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`[Compiler Service] Microserviço TeX Live rodando na porta ${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
