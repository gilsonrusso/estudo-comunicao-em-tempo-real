# 03. Server-Sent Events (SSE)

O **Server-Sent Events (SSE)** é uma especificação do W3C / HTML5 que permite ao servidor empurrar dados de forma **unidirecional** (Server $\to$ Client) através de uma conexão HTTP persistente em modo streaming.

Nos últimos anos, o SSE voltou a ser o centro das atenções na indústria devido ao **streaming de respostas de Inteligência Artificial / LLMs (como OpenAI, Anthropic, Claude, Gemini)** e feeds de notificações.

---

## ⚙️ Como Funciona o Protocolo

Diferente do WebSocket (que faz upgrade de protocolo para TCP puro), o SSE é **100% HTTP padrão**.

### 1. Headers da Requisição e Resposta
O cliente faz um `GET` HTTP normal:
```http
GET /api/stream HTTP/1.1
Host: api.exemplo.com
Accept: text/event-stream
Cache-Control: no-cache
```

O servidor responde com cabeçalhos especiais e **não fecha** a resposta:
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

---

## 📜 Formato das Mensagens (Payload)

O payload do SSE é baseado em texto puro formatado com quebras de linha (`\n`). Cada mensagem termina com duas quebras de linha (`\n\n`).

### Campos Nativos:
- `data:` O conteúdo da mensagem (pode ser texto ou stringified JSON). Se tiver múltiplas linhas, use `data:` em cada uma.
- `id:` Identificador sequencial da mensagem (usado para resiliência na reconexão).
- `event:` Tipo do evento customizado (permite ao cliente escutar eventos específicos).
- `retry:` Tempo em milissegundos que o cliente deve esperar antes de tentar reconectar se a conexão cair.

### Exemplo de Stream Bruto:
```text
event: user_connected
id: 101
data: {"user": "Alice", "role": "admin"}

event: metrics
id: 102
data: {"cpu": 45.2, "ram": 78.1}

retry: 5000
data: Mensagem padrão sem evento nomeado

```

---

## 🔄 Resiliência Nativa: `Last-Event-ID` e Reconexão

Uma das maiores vantagens do SSE sobre WebSockets é que a **reconexão automática é nativa do navegador**.

Se a conexão cair:
1. O browser aguarda o tempo definido (ou o padrão de ~3 segundos).
2. O browser envia automaticamente o header `Last-Event-ID` contendo o último ID recebido:
```http
GET /api/stream HTTP/1.1
Last-Event-ID: 102
```
3. O servidor pode verificar o ID 102 e retransmitir apenas as mensagens perdidas enquanto o cliente estava desconectado!

---

## 💻 Consumindo SSE no Navegador (`EventSource`)

```javascript
// Abre a conexão
const eventSource = new EventSource('/api/stream');

// Escuta mensagens genéricas
eventSource.onmessage = (event) => {
  console.log('Mensagem:', event.data);
};

// Escuta eventos customizados definidos com "event: <nome>"
eventSource.addEventListener('user_connected', (event) => {
  const user = JSON.parse(event.data);
  console.log('Novo usuário:', user.name);
});

// Tratamento de erros e status
eventSource.onerror = (err) => {
  console.error('Erro no stream ou reconectando...', err);
};

// Fechar manualmente
// eventSource.close();
```

---

## 🚀 SSE + HTTP/2: O Fim do Limite de Conexões

No **HTTP/1.1**, os navegadores impõem um limite rígido de **6 conexões simultâneas por domínio**. Se o usuário abrisse 6 abas com SSE, a 7ª aba travaria o carregamento do site.

Com **HTTP/2 (ou HTTP/3)**:
- Múltiplos streams SSE rodam dentro de uma **única conexão TCP multiplexada**.
- Esse limite de 6 conexões desaparece na prática.

---

## ✅ Vantagens do SSE
1. **Simples**: Baseado em HTTP padrão, não precisa de bibliotecas pesadas.
2. **Reconexão e Fallback nativos**: Gerenciado automaticamente pelo browser via `EventSource`.
3. **Firewall / Proxy amigável**: Passa sem problemas por proxies corporativos, WAFs e CDNs que costumam barrar conexões WebSocket.
4. **Segurança**: Suporta os mesmos padrões de cookies, headers e autenticação do HTTP.

## ❌ Limitações do SSE
1. **Apenas Unidirecional**: O cliente não pode enviar mensagens pelo mesmo canal (se precisar enviar algo, deve fazer um `POST` HTTP normal).
2. **Apenas Texto**: Não trafega binários puros diretamente (requer codificação Base64 se necessário).
3. **API nativa `EventSource` não suporta headers customizados**: O `EventSource` padrão do browser não permite passar `Authorization: Bearer <token>` no construtor (geralmente contorna-se com query param, cookie HTTP-only ou usando `fetch` com streams).
