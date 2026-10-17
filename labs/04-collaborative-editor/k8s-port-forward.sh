#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 Encaminhamento de Portas do Kubernetes (Kind)"
echo "=========================================================="
echo "• Frontend (CodeMirror + LaTeX): http://localhost:8080"
echo "• Backend (Fastify + WebSockets): http://localhost:3334"
echo "• Argo CD Web UI:                https://localhost:8443"
echo "=========================================================="

# Mata eventuais port-forwards anteriores nas mesmas portas
pkill -f "port-forward.*8080" || true
pkill -f "port-forward.*3334" || true
pkill -f "port-forward.*8443" || true

# Inicia os port-forwards em background
kubectl port-forward -n collab-app svc/frontend 8080:80 > /dev/null 2>&1 &
PID_FE=$!

kubectl port-forward -n collab-app svc/backend 3334:3333 > /dev/null 2>&1 &
PID_BE=$!

kubectl port-forward -n argocd svc/argocd-server 8443:443 > /dev/null 2>&1 &
PID_ARGO=$!

echo "✅ Port-forwards ativos!"
echo "Pressione Ctrl+C para encerrar todos os port-forwards."

trap "kill $PID_FE $PID_BE $PID_ARGO 2>/dev/null || true; exit 0" INT TERM EXIT

wait
