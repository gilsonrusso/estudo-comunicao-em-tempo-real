# 02. GitOps com Argo CD & Pipelines com Argo Workflows

Este documento detalha o papel do **Argo CD** e do **Argo Workflows** no ciclo de vida de produção do nosso editor colaborativo.

---

## 🐙 1. Argo CD: O Padrão GitOps

O **Argo CD** implementa o princípio de **Single Source of Truth** (Fonte Única da Verdade):
- O repositório Git contém o estado desejado da infraestrutura na pasta `k8s/base/`.
- O operador do Argo CD no cluster compara constantemente o estado real do Kubernetes com o Git.

### O Manifesto `Application` (`k8s/argocd/application.yaml`):
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: collaborative-latex-editor
  namespace: argocd
spec:
  project: default
  source:
    repoURL: 'https://github.com/usuario/estudo-comunicao-em-tempo-real.git'
    targetRevision: HEAD
    path: k8s/base
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: collab-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Como Acessar a Interface Web do Argo CD:
1. Obtenha a senha do usuário `admin`:
   ```bash
   kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo
   ```
2. Inicie o encaminhamento de porta para o painel do Argo CD:
   ```bash
   kubectl port-forward svc/argocd-server -n argocd 8443:443
   ```
3. Abra no navegador:
   **[https://localhost:8443](https://localhost:8443)**
   - Usuário: `admin`
   - Senha: `<copiada no passo 1>`

---

## ⚡ 2. Argo Workflows: Pipelines de Compilação Científica

No mundo de publicações científicas (IEEE, ACM, ArXiv), artigos complexos com centenas de referências bibliográficas não podem ser compilados em um único passo sequencial simples.

Criamos um **`WorkflowTemplate`** (`k8s/workflows/latex-compile-workflow.yaml`) que demonstra como orquestrar a compilação como um pipeline nativo do Kubernetes:

```
[Início]
   │
   ▼
[Passo 1: Pod pdflatex inicial]
   │ - Gera main.aux e referências cruzadas
   ▼
[Passo 2: Pod bibtex (opcional)]
   │ - Resolve citações bibliográficas da base .bib
   ▼
[Passo 3: Pod pdflatex final]
   │ - Compila o PDF consolidado com índices e notas
   ▼
[Fim: PDF pronto para publicação]
```

### Por que usar Argo Workflows para LaTeX?
1. **Contêineres Efêmeros por Compilação:** O Pod de compilação é criado dinamicamente, executa o trabalho e é destruído automaticamente, liberando toda a memória e CPU para outros serviços.
2. **Auditoria e Logs:** Cada compilação gera um histórico detalhado rastreável com logs passo a passo, facilitando o diagnóstico de erros de compilação para os autores.
