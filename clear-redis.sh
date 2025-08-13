#!/bin/bash
# Script para limpar o Redis completamente e reiniciar o backend

echo "🧹 Limpando Redis completamente..."
docker compose exec redis redis-cli FLUSHALL

echo "🔄 Reiniciando backend..."
docker compose restart backend

echo "⏳ Aguardando backend inicializar..."
sleep 5

# Verificar se o backend está saudável
echo "🏥 Verificando saúde do backend..."
curl -s http://localhost:3000/api/v1/health
echo ""

echo "✅ Sistema pronto para testes!"
