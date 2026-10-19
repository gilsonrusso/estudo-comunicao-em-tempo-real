# 🎤 Apresentação da Arquitetura: Editor Colaborativo & Kubernetes GitOps

> Este documento é o atalho para o roteiro completo de apresentação técnica da nossa arquitetura.

O guia completo com diagramas C4, justificativas de engenharia ("O Porquê das Escolhas"), trade-offs (ADRs), fluxos de dados ponta a ponta, roteiro slide a slide e script de Live Demo está disponível em:

👉 **[docs/03-casos-reais-e-padroes/05-apresentacao-arquitetura-lab04-e-k8s.md](file:///mnt/c0b6217c-c2f3-4c1f-8ba2-c8d177f718a9/development/professional/estudo-comunicao-em-tempo-real/docs/03-casos-reais-e-padroes/05-apresentacao-arquitetura-lab04-e-k8s.md)**

---

## 🧭 Tópicos Principais Cobertos no Roteiro

1. **Problema de Negócio & O Desafio do Overleaf:** Concorrência de alta frequência versus carga pesada de CPU do TeX Live.
2. **Frontend (React 18 + CodeMirror 6):** Por que CodeMirror 6 e não Monaco, Compartments dinâmicos de tema, cursores remotos com bandeiras de colaboradores, divisor de tela elástico anti-captura de iframe e DataGrid corporativo com URL Sync.
3. **Backend (Fastify v5 + Zod Type-Provider):** Por que Fastify e não Express, tipagem de ponta a ponta, e a estratégia de persistência em duas camadas (RAM/Redis $\to$ Debounce 3s $\to$ PostgreSQL Checkpoints).
4. **Compiler Sandbox (TeX Live):** Por que desacoplar em microsserviço dedicado, proteção com `-no-shell-escape`, sanitização contra Path Traversal, sandbox efêmero UUID e timeout estrito de 25s.
5. **Storage Poliglota (Postgres, Redis e MinIO S3):** Integridade relacional no PostgreSQL, mensageria e presença em RAM no Redis, e armazenamento de imagens e assets sem inchar o banco no MinIO.
6. **Kubernetes & GitOps (Kind + Argo CD + Argo Workflows):** Repositório Git como única fonte da verdade, reconciliação contínua e pipelines batch para compilações pesadas.
7. **Roteiro Slide a Slide:** Estrutura de 15 a 20 minutos com script de falas para os momentos de maior impacto.
8. **Roteiro da Live Demo:** Passo a passo prático para impressionar a audiência com Alice e Bob colaborando ao vivo, debounce salvando no banco e compilação TeX Live em tempo real.
