# 🧪 Lab 01: Server-Sent Events (SSE) na Prática

Este laboratório demonstra uma implementação real, completa e didática de **Server-Sent Events (SSE)** em Node.js com uma interface interativa no navegador.

---

## 🎯 O que você vai aprender e ver funcionando

1. **Streaming Unidirecional Real**: O servidor enviando dados contínuos para o cliente sem que o cliente precise pedir novamente.
2. **Streaming Estilo LLM / IA (Token por Token)**: Simulação do efeito de digitação de respostas de inteligência artificial (como ChatGPT e Claude).
3. **Múltiplos Tipos de Eventos (`event:`)**:
   - `metric`: Atualização em tempo real de CPU e Memória a cada 1 segundo.
   - `chat_chunk`: Tokens de texto sendo transmitidos sob demanda.
   - `notification`: Alertas instantâneos disparados para todos os clientes conectados.
4. **Resiliência e Reconexão com `Last-Event-ID`**: O que acontece se a conexão oscilar e como o browser recupera automaticamente de onde parou.
5. **Inspeção no DevTools**: Como visualizar o stream de eventos na aba *Network* do navegador.

---

## 🚀 Como Executar

1. Entre na pasta do laboratório:
   ```bash
   cd labs/01-sse-streaming
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
4. Abra o navegador em: [http://localhost:3000](http://localhost:3000)

---

## 🔬 O que Observar no DevTools (Inspecionar Elemento)

1. Abra a aba **Network (Rede)** no DevTools do navegador.
2. Filtre por **Fetch/XHR** ou **All**.
3. Localize a requisição `/api/events/stream`.
4. Note que o status é `(pending)` ou `200 OK`, mas a requisição **nunca termina**.
5. Clique nela e selecione a aba **EventStream**:
   - Você verá os eventos `metric`, `chat_chunk` e `notification` chegando em tempo real com seus IDs e Payloads.
