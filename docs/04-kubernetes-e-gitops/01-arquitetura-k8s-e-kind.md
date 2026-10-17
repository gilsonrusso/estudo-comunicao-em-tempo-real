# 01. Arquitetura Kubernetes & Kind: Do Monólito à Nuvem Elástica

Neste módulo, migramos a arquitetura do **Lab 04 (Editor Colaborativo em LaTeX estilo Overleaf)** do Docker Compose local para um cluster **Kubernetes** completo rodando com **Kind** (*Kubernetes in Docker*).

---

## 🏗️ 1. O Mapa de Recursos no Kubernetes (`collab-app`)

Todos os serviços foram desacoplados e estruturados no namespace `collab-app`:

```mermaid
flowchart TD
    subgraph IngressController [Ingress Controller]
        ING[Ingress: collab-ingress]
    end

    subgraph Front_Tier [Camada Frontend]
        FE_SVC[Service: frontend :80]
        FE_POD[Pod: collab-frontend - Nginx + React]
    end

    subgraph API_Tier [Camada de Comunicação em Tempo Real]
        BE_SVC[Service: backend :3333]
        BE_POD[Pod: collab-backend - Fastify + WebSocket + Zod]
    end

    subgraph Compiler_Tier [Camada de Processamento CPU-Bound]
        COMP_SVC[Service: compiler :4000]
        COMP_POD[Pod: collab-compiler - TeX Live Worker]
        HPA[Horizontal Pod Autoscaler: 1 a 5 Pods]
    end

    subgraph Data_Tier [Camada de Persistência e Mensageria]
        PG_SVC[Service: postgres :5432]
        PG_POD[Pod: collab-postgres + PVC 1Gi]
        RD_SVC[Service: redis :6379]
        RD_POD[Pod: collab-redis]
    end

    ING -->|/| FE_SVC --> FE_POD
    ING -->|/api e /ws| BE_SVC --> BE_POD
    BE_POD <--> RD_SVC --> RD_POD
    BE_POD <--> PG_SVC --> PG_POD
    BE_POD -->|http://compiler:4000/compile| COMP_SVC --> COMP_POD
    HPA -.->|Monitora CPU % e auto-escala| COMP_POD
```

---

## 🎯 2. As Vantagens do Kubernetes para o Editor Colaborativo

### A. Escala Elástica do Compilador com HPA (`compiler-hpa`)
No Docker Compose, o número de contêineres compiladores era estático. No Kubernetes, configuramos o **Horizontal Pod Autoscaler (HPA)**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: compiler-hpa
  namespace: collab-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: collab-compiler
  minReplicas: 1
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```
- Em períodos normais: 1 único Pod do compilador consome recursos mínimos.
- Em períodos de pico (múltiplos usuários recompilando artigos simultaneamente): a CPU ultrapassa 70% e o Kubernetes sobe até 5 réplicas do compilador em paralelo!

### B. Descoberta de Serviços Nativas (Kube-DNS)
No código do backend, a conexão com o compilador é feita de forma limpa via DNS interno:
`http://compiler:4000/compile`
O `kube-proxy` do Kubernetes faz o balanceamento de carga automático (*round-robin*) entre todos os Pods de compilação disponíveis.

---

## 🚀 3. Comandos Úteis para o Cluster Kind

### Verificando os Pods do Sistema
```bash
kubectl get pods -n collab-app
```

### Verificando o Autoscaler (HPA)
```bash
kubectl get hpa -n collab-app
```

### Acessando os Serviços Localmente (Port-Forward)
Para abrir o frontend no navegador:
```bash
kubectl port-forward -n collab-app svc/frontend 8080:80
```
Acesse em: `http://localhost:8080`.

Para testar o backend e os WebSockets:
```bash
kubectl port-forward -n collab-app svc/backend 3333:3333
```
