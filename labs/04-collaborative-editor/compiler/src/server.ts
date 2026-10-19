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

interface CompileFileItem {
  path: string;
  type?: 'text' | 'binary_base64' | 'binary_url';
  content?: string;
  url?: string;
}

interface CompileRequestBody {
  documentId?: string;
  mainEntry?: string; // padrão: 'main.tex'
  content?: string;   // retrocompatibilidade para chamada simples com 1 arquivo
  files?: CompileFileItem[];
}

fastify.post<{ Body: CompileRequestBody }>('/compile', async (request, reply) => {
  const { content, files, mainEntry = 'main.tex', documentId = 'doc' } = request.body || {};

  if (!content && (!files || files.length === 0)) {
    return reply.status(400).send({
      success: false,
      error: 'O corpo da requisição deve conter "content" ou a lista "files" com os arquivos do projeto LaTeX.',
    });
  }

  const jobId = crypto.randomUUID();
  const sandboxDir = path.join(os.tmpdir(), `tex-sandbox-${jobId}`);

  try {
    // 1. Cria diretório efêmero isolado para esta compilação
    await fs.mkdir(sandboxDir, { recursive: true });

    // 2. Prepara os arquivos no sandbox
    if (files && files.length > 0) {
      for (const file of files) {
        // Prevenção de Path Traversal
        const safeRelativePath = path.normalize(file.path).replace(/^(\.\.[\/\\])+/, '');
        const targetPath = path.join(sandboxDir, safeRelativePath);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });

        if (file.type === 'binary_url' && file.url) {
          try {
            const res = await fetch(file.url);
            if (!res.ok) {
              request.log.warn({ url: file.url, status: res.status }, 'Falha ao baixar asset do MinIO');
              continue;
            }
            const arrayBuffer = await res.arrayBuffer();
            await fs.writeFile(targetPath, Buffer.from(arrayBuffer));
          } catch (downloadErr) {
            request.log.error({ err: downloadErr, file: file.path }, 'Erro ao baixar asset remoto');
          }
        } else if (file.type === 'binary_base64' && file.content) {
          await fs.writeFile(targetPath, Buffer.from(file.content, 'base64'));
        } else {
          await fs.writeFile(targetPath, file.content || '', 'utf-8');
        }
      }
    } else if (content) {
      const texPath = path.join(sandboxDir, 'main.tex');
      await fs.writeFile(texPath, content, 'utf-8');
    }

    const safeMainEntry = path.normalize(mainEntry).replace(/^(\.\.[\/\\])+/, '');
    const entryFullPath = path.join(sandboxDir, safeMainEntry);
    const entryBaseName = path.parse(safeMainEntry).name;

    request.log.info({ jobId, documentId, mainEntry: safeMainEntry, filesCount: files?.length || 1 }, 'Iniciando compilação LaTeX em sandbox');

    // Helper para execução segura de processos no sandbox
    const runProcess = (
      cmd: string,
      args: string[],
      timeoutMs = 25000
    ): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
      return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';

        const child = spawn(cmd, args, {
          timeout: timeoutMs,
          cwd: sandboxDir,
        });

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
          stderr += `\nErro ao disparar processo ${cmd}: ${err.message}`;
          resolve({ exitCode: 1, stdout, stderr });
        });
      });
    };

    // 3. Executa pdflatex com proteções de segurança (-no-shell-escape)
    // Passe 1: Gera .aux inicial e primeira saída
    const pdflatexArgs = [
      '-interaction=nonstopmode',
      '-no-shell-escape',
      `-output-directory=${sandboxDir}`,
      entryFullPath,
    ];

    let compileResult = await runProcess('pdflatex', pdflatexArgs);

    // Se gerou .aux, verifica se há citações bibliográficas que requerem bibtex
    const auxPath = path.join(sandboxDir, `${entryBaseName}.aux`);
    let requiresBibtex = false;
    try {
      const auxContent = await fs.readFile(auxPath, 'utf-8');
      if (auxContent.includes('\\bibdata') || auxContent.includes('\\citation')) {
        requiresBibtex = true;
      }
    } catch {
      // Ignora erro ao ler .aux
    }

    if (requiresBibtex) {
      request.log.info({ jobId, entryBaseName }, 'Executando bibtex para resolver citações bibliográficas');
      await runProcess('bibtex', [entryBaseName], 15000);
      // Passe 2 pós-bibtex para incorporar as referências
      await runProcess('pdflatex', pdflatexArgs);
    }

    // Passe final de consolidação de referências cruzadas (\ref, \label, sumário)
    compileResult = await runProcess('pdflatex', pdflatexArgs);

    const pdfPath = path.join(sandboxDir, `${entryBaseName}.pdf`);
    const logPath = path.join(sandboxDir, `${entryBaseName}.log`);

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
