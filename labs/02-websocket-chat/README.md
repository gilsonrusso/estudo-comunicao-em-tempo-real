# 🧪 Lab 02: WebSocket Full-Duplex Chat com Salas e Presença

Este laboratório demonstra uma implementação robusta e do mundo real de **WebSockets nativos** em Node.js (usando a biblioteca de alta performance `ws`).

---

## 🎯 O que você vai aprender e ver funcionando

1. **Comunicação Full-Duplex**: Mensagens trafegando instantaneamente em ambas as direções com latência mínima.
2. **Sistema de Salas (*Rooms*)**: Isolamento de mensagens por canal (`#geral`, `#tecnologia`, `#random`).
3. **Mecanismo de Presença e Heartbeat (Ping/Pong)**:
   - O servidor dispara frames de `ping` periódicos a cada 30 segundos.
   - Detecção e eliminação automática de **conexões zumbis** (half-open).
4. **Indicador de Digitação (*Typing Indicator*)**: Exibe quem está digitando em tempo real.
5. **Reconexão com Backoff Exponencial no Cliente**: O cliente tenta restabelecer a conexão de forma inteligente se o servidor reiniciar.
6. **Inspeção de Frames WS no DevTools**: Como ver os frames brutos (Opcodes, payload) trafegando na aba *Network*.

---

## 🚀 Como Executar

1. Entre na pasta do laboratório:
   ```bash
   cd labs/02-websocket-chat
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
4. Abra **duas ou mais abas** no navegador em: [http://localhost:4000](http://localhost:4000)
   - Digite um apelido diferente em cada aba (ex: "Alice" e "Bob") e teste a conversa em tempo real!

---

## 🔬 O que Observar no DevTools

1. Abra a aba **Network (Rede)** no DevTools (F12).
2. Filtre por **WS (WebSockets)**.
3. Clique na conexão `ws://localhost:4000/ws`.
4. Abra a aba **Messages (Mensagens)**:
   - Você verá os frames com setas verdes (enviadas pelo cliente) e vermelhas (recebidas do servidor), incluindo os dados JSON de cada ação.
