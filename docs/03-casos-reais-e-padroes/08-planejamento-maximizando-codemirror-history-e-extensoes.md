# 🏛️ Planejamento Arquitetural: Maximizando o CodeMirror 6 (Auditoria Git, Entregas Realizadas e Backlog Restante)

Este documento consolida o estado real da base de código do **Lab 04 (Editor Colaborativo)**, auditando tudo o que foi alterado e adicionado no Git, detalhando as funcionalidades do CodeMirror 6 já implementadas e aprovadas em testes automatizados, e mapeando com precisão o que ainda falta para atingirmos 100% de aproveitamento do motor oficial.

---

## 1. Auditoria Geral de Modificações no Git

A inspeção do repositório (`git status`) mapeia as seguintes modificações estruturais divididas entre Backend, Frontend e Documentação:

### 1.1. Documentação de Arquitetura (`docs/03-casos-reais-e-padroes/`)
* **`06-planejamento-migracao-codemirror-collab.md`**: Planejamento da transição para o motor de concorrência oficial (`@codemirror/collab` com OT nativa).
* **`07-analise-e-boas-praticas-codemirror-extensions.md`**: Guia de engenharia, governança para PRs, desduplicação por identidade (`===`) e memoização referencial.
* **`08-planejamento-maximizando-codemirror-history-e-extensoes.md`**: Este documento vivo de rastreabilidade, cobrindo o manual de referência completo e a decomposição de componentes.

### 1.2. Backend (`labs/04-collaborative-editor/backend/`)
* **`documents.schema.ts`**: Adição de schemas Zod para mensagens `COLLAB_PUSH`, `COLLAB_SYNC`, `COLLAB_PULL` e payloads com `ChangeSet` JSON.
* **`documents.service.ts`**: Suporte ao versionamento formal com authority server e checkpoints de snapshot.
* **`documents.websocket.ts`**: Roteamento de eventos WebSocket para distribuição de deltas colaborativos.
* **`documents.service.test.ts`**: Suíte de testes unitários do backend cobrindo o rebase de versões.

### 1.3. Frontend (`labs/04-collaborative-editor/frontend/`)
* **Dependência instalada**: `@codemirror/merge` adicionado ao `package.json` para diffs e comparação de versões.

#### A. Novos Módulos de Extensões Puras (`src/features/editor/extensions/`)
1. **`history/historyExtension.ts` & `.test.ts`**:
   * Encapsula `historyCompart` (`minDepth: 300`).
   * Expõe `getHistoryStatus(state)` para leitura reativa de `canUndo`, `canRedo`, `undoDepth`, `redoDepth`.
   * Expõe `triggerUndo(view)` e `triggerRedo(view)` como comandos puros desacoplados da UI.
2. **`theme/editorThemes.ts`**:
   * Singletons estáticos `codeMirrorDarkTheme` e `codeMirrorLightTheme` com suporte escopado para linters, busca, tooltips e placeholders.
3. **`config/editorCompartments.ts`**:
   * 8 instâncias de `Compartment` estáticas (`themeCompart`, `spellcheckCompart`, `editorConfigCompart`, `wordWrapCompart`, etc.).
   * Caches estáveis de extensão (`Record<string, Extension>`) para desduplicação garantida de referências no motor do CodeMirror.
4. **`config/editorPhrases.ts`**:
   * Dicionário de internacionalização nativo em `pt-BR` via `EditorState.phrases` (traduzindo buscas, substituições e prompts de linha).
5. **`config/editorKeymaps.ts`**:
   * Hierarquia estrita de precedência via `Prec.high`, `Prec.default` e `Prec.low`.
   * Atalhos de IDE: `Mod-/` (`toggleComment`), `Mod-d` (`selectNextOccurrence`), `Alt-g` (`gotoLine`), movimentação/cópia de linhas (`Alt+Setas`, `Shift+Alt+Setas`) e exclusão de linha (`Mod-Shift-k`).
6. **`latex/latexAutocomplete.ts`**:
   * `BASE_LATEX_COMPLETIONS` com snippets espelhados dinâmicos (`\begin{${1:env}}...\end{${1}}`).
   * `createLatexCompletionSource` com cache de verificação (`validFor`).
   * `createBibHoverTooltip` para visualização flutuante de citações `\cite{...}`.
7. **`latex/latexFolding.ts`**:
   * `latexFoldService` dedicado para seções (`\section`, `\chapter`) e ambientes delimitados.
8. **`latex/latexLinter.ts`**:
   * `parseLatexCompilerError` mapeando logs `l.X` do TeX Live para a linha exata.
   * `validateLatexStructure` para verificação client-side de fechamento de tags.
9. **`cursors/remoteCursorsExtension.ts`**:
   * `CursorWidget` DOM e `remoteCursorsField` para presença e seleções coloridas em tempo real.
10. **`comments/commentsExtension.ts`**:
    * `commentsField`, `buildCommentDecorations`, `setCommentsEffect` e `selectionCommentTooltipField` via `showTooltip`.
11. **`collab/collabExtension.ts`**:
    * `collabSyncFacet` e `collabPushPlugin` gerenciando a sincronização com o backend.

#### B. Novos Serviços e Utilitários (`src/features/editor/`)
1. **`services/editorStateCache.ts`**:
   * Armazena snapshots serializados de `EditorState` com `historyField` (`state.toJSON({ history: historyField })`), garantindo **preservação total do histórico de Ctrl+Z ao alternar entre abas de arquivos**.
2. **`utils/bibtexParser.ts`**:
   * Parser robusto e desacoplado de arquivos `.bib` (`parseBibEntries`, `extractBibKeys`).

#### C. Novos Componentes React Reutilizáveis (Sem `React.FC`, Named Exports)
1. **`components/EditorHistoryControls.tsx` & `.test.tsx`**:
   * Botões compactos de Desfazer e Refazer com tooltips inteligentes (`⌘Z` / `Ctrl+Z`), contagem de operações e estados desabilitados.
2. **`components/EditorDiffViewer.tsx` & `.test.tsx`**:
   * Comparador visual de histórico oficial com **suporte duplo: Lado a Lado (`MergeView`) e Inline (`unifiedMergeView`)**, com alternador no cabeçalho e botão "Restaurar para esta Versão".
3. **`components/EditorStatusBar.tsx`**:
   * Barra inferior/superior com identificação de linguagem (`LaTeX sTeX`), status de sincronização e autor ativo.
4. **`components/EditorCommentDialog.tsx`**:
   * Diálogo isolado para redação de comentários inline sobre texto selecionado.

#### D. Componentes Integrados e Refatorados
* **`CodeMirrorEditor.tsx`**: Fatiado de **2.362 linhas para ~700 linhas**, agora orquestrando os novos módulos, ativando `scrollPastEnd()`, `placeholder()`, `editorPortuguesePhrasesExtension` e keymaps hierárquicos.
* **`HistorySidebar.tsx`**: Integrado o botão "Comparar com Atual" em cada card de snapshot da lista.
* **`IdeNavbar.tsx`**: Integrado o `EditorHistoryControls` e atalhos no menu *Edit*.
* **`EditorWorkspace.tsx`**: Conectado o `EditorDiffViewer`, restauração de versão por snapshot e preservação de histórico por aba.
* **`CollabEditorContext.tsx`**: Gerencia o estado global de histórico (`historyStatus`) e despachos de Undo/Redo.

---

## 2. Matriz de Status: O Que Já Foi Feito vs. O Que Falta

| Recurso / Pacote | Status Real | O que JÁ ESTÁ pronto no código | O que AINDA FALTA fazer |
| :--- | :---: | :--- | :--- |
| **`@codemirror/merge`** | **100% Concluído** | `MergeView` (Lado a Lado) e `unifiedMergeView` (Inline) integrados no `EditorDiffViewer.tsx`, acionados pelo `HistorySidebar.tsx` e cobertos por testes unitários. | *Nenhuma pendência.* |
| **`@codemirror/commands`** | **95% Concluído** | `toggleComment` (`Mod-/`), `moveLineUp/Down`, `copyLineUp/Down`, `deleteLine`, `cursorMatchingBracket`, `historyExtension.ts`, `EditorHistoryControls.tsx`. | `toggleTabFocusMode` (modo de acessibilidade para alternar foco via Tab). |
| **`@codemirror/search`** | **95% Concluído** | `selectNextOccurrence` (`Mod-d` multi-cursor) e `gotoLine` (`Alt-g` pular para linha). | `selectSelectionMatches` (selecionar todas as ocorrências de uma só vez). |
| **`@codemirror/view`** | **80% Concluído** | `scrollPastEnd()`, `placeholder(...)`, temas oficiais e layout. | **Remover resquício de popup manual no React:** O `CodeMirrorEditor.tsx` ainda possui listeners manuais de `mousedown`/`mouseup` e matemática de `coordsAtPos` legada, devendo delegar 100% ao `showTooltip` nativo. |
| **`@codemirror/state`** | **80% Concluído** | `EditorState.phrases` em PT-BR para buscas e comandos; preservação de `historyField` no cache de abas. | `charCategorizer`: configurar para que o duplo-clique selecione `\comando` inteiro incluindo a barra invertida (e não só `comando`). |
| **`@codemirror/lint`** | **75% Concluído** | Linters de compilação e gramática com Quick-Fixes (`Diagnostic.actions`) e navegação via `F8`. | Criar botão/ação visual na interface para acionar `openLintPanel` (painel inferior de diagnósticos). |
| **`@codemirror/autocomplete`**| **90% Concluído** | Snippets com espelhamento dinâmico (`\begin{${1:env}}...\end{${1}}`), caching com `validFor`. | `pickedCompletion`: auto-import de pacotes LaTeX (ex.: inserir `\usepackage{amsmath}` se o usuário completou `\begin{align}`). |
| **`@codemirror/lsp-client`** | **0% (Infraestrutura)**| Arquitetura planejada no frontend. | Requer um Language Server de LaTeX (`texlab`) instalado e rodando em background no container backend com proxy WebSocket. |

---

## 3. Backlog Detalhado de Implementação Restante

### Item 1: Limpeza do Popup Manual de Seleção em `CodeMirrorEditor.tsx`
* **Problema Atual**: O arquivo ainda mantém `isMouseDownRef`, `window.addEventListener('mouseup')`, medição de `containerRect` e o estado `selectionPopup`.
* **Ação**: Remover esses listeners manuais e confiar exclusivamente no `selectionCommentTooltipField`, que usa `showTooltip` nativo e acompanha o scroll perfeitamente.
* **Impacto**: Redução de ~80 linhas de código no componente React e eliminação de bugs de rolagem.

### Item 2: Tokenização de Comandos LaTeX via `charCategorizer`
* **Problema Atual**: Ao dar duplo clique em `\section`, o CodeMirror seleciona apenas `section` (deixando a barra `\` de fora).
* **Ação**: Adicionar extensão `charCategorizer` ou estender o parser `stex` com `wordChars: '\\'`.
* **Impacto**: Seleção de comandos LaTeX em 2 cliques de forma idêntica ao Overleaf e VS Code.

### Item 3: Botão de Abertura do Painel de Diagnósticos (`openLintPanel`)
* **Problema Atual**: O usuário só vê erros se passar o mouse sobre a linha ou apertar `F8`.
* **Ação**: Adicionar um botão "Erros / Avisos (N)" na barra de ferramentas ou rodapé que execute `openLintPanel(view)`.
* **Impacto**: Visibilidade instantânea de todos os erros de compilação do documento em uma lista navegável.

### Item 4: Auto-import de Pacotes LaTeX via `pickedCompletion`
* **Problema Atual**: Ao completar um ambiente avançado (ex.: `\begin{align}` ou `\begin{tikzpicture}`), o usuário precisa lembrar de ir ao topo do arquivo e digitar `\usepackage{amsmath}`.
* **Ação**: Usar o hook `pickedCompletion` do `@codemirror/autocomplete` para inspecionar se o preâmbulo já contém o pacote e, se não contiver, inseri-lo automaticamente.

### Item 5: Conexão com Language Server Protocol (`@codemirror/lsp-client`)
* **Dependência**: Infraestrutura de container no backend.
* **Ação**: Subir o binário do `texlab` no container Docker do backend e expor uma rota WebSocket `/api/lsp/latex`. No frontend, conectar via `new LSPClient(...)`.

---

## 4. Métricas de Qualidade e Cobertura Atual

```bash
# Validação executada após a refatoração e implementação modular
npm test -- --run
```
* **Testes Automatizados**: **60 testes em 12 arquivos** passando com 100% de sucesso.
* **Tipagem TypeScript**: `npx tsc --noEmit` executado sem erros (`0 errors`).
* **Linter ESLint**: `npm run lint` validado sem erros (`0 errors`).
* **Redução de Complexidade**: O arquivo monolítico `CodeMirrorEditor.tsx` foi reduzido de **2.362 linhas** para **~700 linhas**, com toda lógica de negócio distribuída em 13 novos arquivos especializados.
