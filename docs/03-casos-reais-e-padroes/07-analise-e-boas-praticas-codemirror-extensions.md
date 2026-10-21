# 📐 Análise de Extensibilidade e Boas Práticas no CodeMirror 6

Este documento consolida a análise técnica profunda sobre o sistema de extensões do **CodeMirror 6** (referência: [CodeMirror System Guide - Extension](https://codemirror.net/docs/guide/#extension)), avalia a conformidade da implementação do **Lab 04 (Editor Colaborativo)** em relação às práticas oficiais recomendadas e registra os ajustes de arquitetura aplicados.

---

## 1. Fundamentos da Arquitetura do CodeMirror 6

Diferente de versões anteriores (CM5) ou de outros editores web convencionais baseados em herança de classes e manipulação imperativa do DOM, o CodeMirror 6 foi desenhado sob o paradigma **"Functional Core, Imperative Shell"**.

### 1.1. O Tipo `Extension` e sua Composição
No `@codemirror/state`, a extensão é formalizada como:
```typescript
type Extension = { extension: Extension } | readonly Extension[];
```
* **Árvore Recursiva de Extensões**: Uma extensão pode ser um valor primitivo (`Facet`, `StateField`, `Theme`) ou um array aninhado de extensões em qualquer profundidade.
* **Achatamento (*Flattening*) e Deduplicação por Referência (`===`)**: Durante a inicialização ou reconfiguração do estado, o CodeMirror achata o grafo de extensões e remove duplicatas com base na **igualdade estrita de referência (`===`)**. Se duas dependências exigirem a mesma extensão `B`, ela só será ativada uma única vez se a referência for idêntica.

### 1.2. Os Blocos Fundamentais
1. **`Facet`**: Ponto de extensão para agregação de configurações e dados vindos de múltiplos pontos, com resolução via função `combine` (ex.: lista de listeners, tab size, modo read-only).
2. **`StateField`**: Armazena estado funcional e imutável dentro de `EditorState` com ciclo de vida acoplado a transações (*reducers* puros com `create` e `update`).
3. **`ViewPlugin`**: Camada imperativa ligada ao DOM e ao ciclo de renderização (`EditorView`). Não deve armazenar estado persistente; serve para reagir a viewports e interações.
4. **`Compartment`**: Encapsula uma extensão ou grupo de extensões para permitir substituição dinâmica em tempo de execução via `compartment.reconfigure(newExt)` sem desmontar o editor nem perder histórico.
5. **`Prec` (Precedence)**: Controla a hierarquia de execução e prioridade (`highest`, `high`, `default`, `low`, `lowest`). Essencial para atalhos de teclado (`keymap`) e interceptadores de eventos.

---

## 2. Diagnóstico da Implementação no Projeto (`labs/04-collaborative-editor`)

A avaliação do arquivo central `labs/04-collaborative-editor/frontend/src/features/editor/components/CodeMirrorEditor.tsx` revelou tanto pontos fortes quanto gargalos de extensibilidade:

### 2.1. Pontos Fortes (Conformidade com CM6)
* **Reconfiguração via Compartments**: Uso de 8 instâncias de `Compartment` (`themeCompart`, `wordWrapCompart`, `autoCloseBracketsCompart`, `autocompleteCompart`, `linterCompart`, `grammarLinterCompart`, `spellcheckCompart`, `editorConfigCompart`) no `useEffect` de settings, evitando a recriação destrutiva do `EditorView`.
* **StateFields Funcionais Puros**: `remoteCursorsField`, `commentsField` e `selectionCommentTooltipField` operam com imutabilidade estrita, disparando `StateEffect` e mapeando coordenadas com `RangeSetBuilder` e `tr.changes.mapPos`.
* **Adoção do `@codemirror/collab`**: Uso das primitivas oficiais de colaboração em tempo real (`sendableUpdates`, `receiveUpdates`, `getSyncedVersion`).

### 2.2. Oportunidades de Ajuste Identificadas
1. **Ausência de Precedência Explícita (`Prec`)**:
   * *Diagnóstico*: Os mapeamentos de teclado (`keymap.of([...])`, `closeBracketsKeymap`, `lintKeymap`) estavam usando apenas a ordem posicional padrão (`Prec.default`), correndo risco de colisão de teclas como `Tab`, `Esc` e `Enter`.
2. **Recriação Repetitiva de Temas Dinâmicos**:
   * *Diagnóstico*: A função `getEditorConfigExtension(fontSize, lineHeight, nonBlinkingCursor)` instanciava um novo `EditorView.theme({ ... })` a cada reconfiguração, gerando classes dinâmicas e regras CSS descartáveis na tag `<head>` da página.
3. **`ViewPlugin` Anônimo/Inline**:
   * *Diagnóstico*: O plugin de push colaborativo era instanciado diretamente dentro do array inline de extensões com `ViewPlugin.fromClass(class { ... })`. Essa definição impede a desduplicação por identidade de referência recomendada pelo guia oficial.
4. **Ausência de `Facet` para Configuração**:
   * *Diagnóstico*: O editor dependia unicamente de injeção imperativa via React props sem utilizar os mecanismos de Facet declarativo do CodeMirror.

---

## 3. Matriz Comparativa: Antes vs. Depois dos Ajustes

| Critério | Antes do Ajuste | Depois do Ajuste | Ganho de Engenharia |
| :--- | :--- | :--- | :--- |
| **Hierarquia de Keymaps** | `keymap.of([...])` sem precedência definida | `Prec.high(keymap.of(closeBracketsKeymap))`, `Prec.default(...)`, `Prec.low(keymap.of(lintKeymap))` | Eliminação de conflitos de atalhos e priorização garantida de comandos essenciais. |
| **Estabilidade de Temas e Config** | `EditorView.theme()` recriado a cada chamada de `getEditorConfigExtension` | Cache/Memoização referencial estrita por chave de configuração | Deduplicação automática pelo CodeMirror (`===`); sem injeção duplicada de seletores CSS no DOM. |
| **Plugin de Colaboração** | Classe anônima inline em `ViewPlugin.fromClass` dentro do `useEffect` | Classe nomeada `CollabPushPlugin` e singleton `collabPushPlugin` em nível de módulo desacoplado | Portabilidade, isolamento de testes e preservação de identidade de instância. |
| **Configuração Colaborativa** | Acesso direto a React refs (`.current`) dentro do plugin | `collabSyncFacet` (`Facet.define`) gerenciando o contrato de envio | Arquitetura idiomática do CodeMirror baseada em Facets declarativos. |

---

## 4. Ajustes Implementados no Código

### 4.1. Precedência Estruturada com `Prec`
Em `CodeMirrorEditor.tsx`:
```typescript
import { Prec } from '@codemirror/state';

// 1. Alta precedência: fechamento imediato de caracteres
autoCloseBracketsCompart.of(
  settings.autoCloseBrackets ? [closeBrackets(), Prec.high(keymap.of(closeBracketsKeymap))] : []
)

// 2. Precedência padrão: comandos de edição, histórico, busca e indentação
Prec.default(
  keymap.of([
    ...defaultKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...searchKeymap,
    indentWithTab,
  ])
)

// 3. Menor precedência: atalhos secundários de diagnósticos/lint
linterCompart.of(
  settings.codeCheck
    ? [lintGutter(), linter(latexLinterSource), Prec.low(keymap.of(lintKeymap))]
    : []
)
```

### 4.2. Memoização Referencial de Extensões Dinâmicas
Garante que configurações idênticas retornem **a mesma instância de objeto na memória**, habilitando a desduplicação nativa do motor do CodeMirror:
```typescript
const editorConfigThemeCache = new Map<string, Extension>();

export function getEditorConfigExtension(
  fontSize: string,
  lineHeight: string,
  nonBlinkingCursor: boolean
): Extension {
  const key = `${fontSize || '13.5px'}_${lineHeight || '1.65'}_${Boolean(nonBlinkingCursor)}`;
  let cached = editorConfigThemeCache.get(key);
  if (!cached) {
    cached = EditorView.theme({
      '&': { fontSize: `${fontSize || '13.5px'} !important` },
      '.cm-line': { lineHeight: `${lineHeight || '1.65'} !important` },
      ...(nonBlinkingCursor
        ? { '.cm-cursor, &.cm-focused .cm-cursor': { animation: 'none !important', opacity: '1 !important' } }
        : {}),
    });
    editorConfigThemeCache.set(key, cached);
  }
  return cached;
}
```

### 4.3. Singleton `ViewPlugin` com `Facet`
Substituição da classe inline pelo padrão oficial de Facet de configuração + Singleton de Plugin:
```typescript
export interface CollabSyncConfig {
  onPush: (file: string, version: number, updates: CollabUpdateJSON[]) => void;
  isRemoteChange: () => boolean;
  getClientId: () => string;
  getActiveFile: () => string;
}

export const collabSyncFacet = Facet.define<CollabSyncConfig, CollabSyncConfig | null>({
  combine(values) {
    return values[values.length - 1] || null;
  },
});

class CollabPushPlugin {
  private pushing = false;
  constructor(private view: EditorView) {}
  update(update: ViewUpdate) {
    const config = this.view.state.facet(collabSyncFacet);
    if (!config) return;
    if (update.docChanged && !config.isRemoteChange()) {
      this.push(config);
    }
  }
  push(config: CollabSyncConfig) {
    if (this.pushing) return;
    const updates = sendableUpdates(this.view.state);
    if (!updates.length) return;
    this.pushing = true;
    const ver = getSyncedVersion(this.view.state);
    const jsonUpdates: CollabUpdateJSON[] = updates.map((u) => ({
      clientID: config.getClientId() || 'anon',
      changes: u.changes.toJSON(),
    }));
    config.onPush(config.getActiveFile(), ver, jsonUpdates);
    this.pushing = false;
  }
}

export const collabPushPlugin = ViewPlugin.fromClass(CollabPushPlugin);
```

---

## 5. Diretrizes e Checklist de Governança para Futuras Extensões

Para manter a consistência e a estabilidade nas próximas iterações do editor, toda nova funcionalidade deve seguir este checklist antes de entrar em produção:

1. **Função Construtora Exportada**: Toda extensão pública deve ser exposta como função (ex.: `export function myExtension(options?): Extension`).
2. **Singletons para Instâncias Estáticas**: Instâncias de `StateField`, `Facet`, `ViewPlugin` e temas base devem residir no escopo do módulo e nunca ser recriadas dentro de funções renderizadoras do React.
3. **Desacoplamento do React**: Extensões do CodeMirror não devem acessar diretamente `ref.current`. A comunicação deve ocorrer via `view.dispatch({ effects: [...] })` ou via `Facet`.
4. **Reconfiguração via Compartment**: Qualquer funcionalidade que possa ser ligada/desligada pelo usuário deve ser encapsulada em um `Compartment`.
5. **Precedência Explícita em Keymaps**: Todo `keymap.of()` deve ter seu nível definido expressamente via `Prec.high`, `Prec.default` ou `Prec.low`.
6. **Testes Unitários sem React**: Novos `StateField`, `Facet` e lógica de folding/parsing devem possuir testes puros com `EditorState.create({ ... })` no Vitest, garantindo execução ultrarrápida e isolada.
