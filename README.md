# EchoChat 🚀

Aplicação de chat em tempo real com NestJS (backend), React (frontend) e WebSocket.

## 🚀 Execução Rápida

### Pré-requisitos
- Docker e Docker Compose
- Git

### 1. Clone e execute
```bash
git clone <url-do-repositorio>
cd desafio

# Configure as variáveis de ambiente
cp backend/env.example backend/.env

# Execute tudo
docker-compose up -d
```

### 2. Acesse
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000/api/v1

### 3. Primeiro acesso
1. Acesse http://localhost:8080
2. Registre uma nova conta
3. Comece a usar!

## 📚 Documentação Detalhada

- [Backend](./backend/README.md) - API NestJS, banco de dados, WebSocket
- [Frontend](./frontend/README.md) - Interface React, componentes, responsividade
- [Testes de Carga](./load-tests/README.md) - Scripts e métricas de performance

## 🔧 Comandos Úteis

```bash
# Ver logs
docker-compose logs -f

# Parar tudo
docker-compose down

# Reconstruir
docker-compose build --no-cache

# Status dos containers
docker-compose ps
```

## 🐛 Problemas Comuns

**Porta ocupada?**
```bash
lsof -i :3000 -i :8080 -i :5433 -i :6380
```

**Banco não conecta?**
```bash
docker-compose restart postgres
```

**Frontend não carrega?**
```bash
docker-compose logs frontend
```

---

**EchoChat** - Conectando pessoas através da tecnologia 🚀
