import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Estrutura para armazenar todos os clientes SSE conectados
let clients = new Set();
let globalEventId = 1;

/**
 * Helper para formatar e enviar uma mensagem no padrão SSE:
 * id: <number>
 * event: <string>
 * retry: <number>
 * data: <string>
 * \n\n
 */
function sendSSE(res, { event, data, id, retry }) {
  if (id !== undefined) res.write(`id: ${id}\n`);
  if (event) res.write(`event: ${event}\n`);
  if (retry) res.write(`retry: ${retry}\n`);
  
  const payload = typeof data === 'object' ? JSON.stringify(data) : data;
  res.write(`data: ${payload}\n\n`);
}

/**
 * 1. Endpoint principal SSE
 * O cliente abre uma conexão com 'new EventSource("/api/events/stream")'
 */
app.get('/api/events/stream', (req, res) => {
  // Cabeçalhos fundamentais para SSE funcionar
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Impede que o Nginx faça buffer da resposta
  });

  // Instruir o cliente a tentar reconectar em 3 segundos se a rede cair
  res.write('retry: 3000\n\n');

  // Verifica se o cliente está se reconectando e informou de onde parou
  const lastEventId = req.headers['last-event-id'];
  if (lastEventId) {
    console.log(`[SSE] Cliente reconectou! Último evento recebido: ${lastEventId}`);
  } else {
    console.log(`[SSE] Novo cliente conectado.`);
  }

  // Registra o cliente na lista de conexões ativas
  clients.add(res);

  // Mensagem inicial de boas-vindas
  sendSSE(res, {
    event: 'welcome',
    id: globalEventId++,
    data: { message: 'Conectado com sucesso ao canal SSE!', clientId: clients.size }
  });

  // Limpeza quando o cliente desconectar (fechar a aba ou navegador)
  req.on('close', () => {
    clients.delete(res);
    console.log(`[SSE] Cliente desconectado. Total ativos: ${clients.size}`);
  });
});

/**
 * 2. Broadcast periódico de métricas do sistema a cada 2 segundos
 */
setInterval(() => {
  if (clients.size === 0) return;

  const metricsData = {
    cpu: +(Math.random() * 40 + 10).toFixed(1), // Simula CPU entre 10% e 50%
    memory: +(Math.random() * 20 + 60).toFixed(1), // Simula Memória entre 60% e 80%
    activeConnections: clients.size,
    timestamp: new Date().toLocaleTimeString()
  };

  const id = globalEventId++;
  for (const client of clients) {
    sendSSE(client, {
      event: 'metric',
      id,
      data: metricsData
    });
  }
}, 2000);

/**
 * 3. Endpoint para simular streaming de resposta de IA (Token a Token)
 * Semelhante à API da OpenAI / Anthropic
 */
app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const simulatedResponse = `Resposta gerada para "${prompt || 'sua pergunta'}": O Server-Sent Events é extremamente eficiente para fluxos onde apenas o servidor gera novos dados, eliminando o overhead de handshakes contínuos.`;

  // Divide o texto em pequenos tokens de palavras para simular streaming
  const words = simulatedResponse.split(' ');

  for (let i = 0; i < words.length; i++) {
    sendSSE(res, {
      event: 'chat_chunk',
      data: { token: words[i] + ' ', index: i }
    });
    // Simula delay natural de geração do modelo de IA
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  // Evento sinalizando que o streaming acabou
  sendSSE(res, {
    event: 'chat_end',
    data: { status: 'complete', totalTokens: words.length }
  });

  res.end();
});

/**
 * 4. Endpoint REST para disparar uma notificação instantânea para todos
 */
app.post('/api/notify', (req, res) => {
  const { title, message } = req.body;

  const notification = {
    title: title || 'Alerta do Sistema',
    message: message || 'Esta é uma notificação em tempo real!',
    time: new Date().toLocaleTimeString()
  };

  const id = globalEventId++;
  for (const client of clients) {
    sendSSE(client, {
      event: 'notification',
      id,
      data: notification
    });
  }

  res.json({ success: true, recipients: clients.size });
});

app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 Lab 01 (SSE) rodando em http://localhost:${PORT}`);
  console.log(`=================================================\n`);
});
