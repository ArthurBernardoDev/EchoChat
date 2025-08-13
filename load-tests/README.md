# Load Tests - EchoChat

Este diretório contém testes de carga para a aplicação EchoChat, utilizando múltiplas ferramentas e estratégias para validar a performance e escalabilidade do sistema.

## 📁 Estrutura do Projeto

```
load-tests/
├── tests/             # Testes customizados em Node.js
├── data/              # Dados de teste (usuários, salas)
├── utils/             # Utilitários e configurações
└── package.json       # Dependências e scripts
```

## 🛠️ Ferramentas Utilizadas

### 1. **Node.js Custom Tests**
Testes customizados desenvolvidos especificamente para o EchoChat, com métricas detalhadas e controle fino sobre os cenários de teste.

## 🚀 Como Executar

### Pré-requisitos

```bash
# Instalar dependências
pnpm install

# Certifique-se de que a aplicação EchoChat está rodando
# Por padrão, os testes apontam para http://localhost:3000
```

### Scripts Disponíveis

#### Testes Customizados (Node.js)

```bash
# Teste básico de autenticação
pnpm run test:basic

# Teste de mensagens de chat
pnpm run test:chat

# Teste do sistema de amigos
pnpm run test:friends

# Teste do sistema de salas
pnpm run test:rooms

# Teste de stress WebSocket
pnpm run test:websocket

# Teste integrado do sistema
pnpm run test:integrated

# Teste extremo de carga (5.000 mensagens)
node tests/07-test-extreme-load.js

# Executar todos os testes
pnpm run test:all
```

#### Testes de Carga Progressiva

```bash
# Teste progressivo padrão
pnpm run test

# Teste com 1.000 usuários
pnpm run test:1k

# Teste com 10.000 usuários
pnpm run test:10k

# Teste com 100.000 usuários
pnpm run test:100k

# Teste com 1.000.000 usuários
pnpm run test:1m
```

## 📊 Tipos de Teste

### 1. **Autenticação Básica** (`01-basic-auth.js`)
- Testa registro e login de usuários
- Valida tokens JWT
- Mede tempo de resposta da autenticação

### 2. **Sistema de Mensagens** (`02-chat-messages.js`)
- Envio e recebimento de mensagens
- Teste de throughput de mensagens
- Validação de entrega em tempo real

### 3. **Sistema de Amigos** (`03-friends-system.js`)
- Envio de solicitações de amizade
- Aceitação/rejeição de solicitações
- Listagem de amigos

### 4. **Sistema de Salas** (`04-rooms-system.js`)
- Criação e entrada em salas
- Mensagens em grupo
- Gerenciamento de participantes

### 5. **Stress WebSocket** (`05-websocket-stress.js`)
- Conexões simultâneas via WebSocket
- Mensagens em tempo real
- Teste de reconexão

### 6. **Sistema Integrado** (`06-integrated-system.js`)
- Cenário completo de uso
- Múltiplas funcionalidades combinadas
- Simulação de usuários reais

### 7. **Teste Extremo de Carga** (`07-test-extreme-load.js`)
- **Objetivo**: Testar os limites do sistema com carga extrema
- **Configuração**: 50 usuários × 100 mensagens = 5.000 mensagens totais
- **Características**:
  - Sistema de filas assíncronas para processamento
  - Pool de conexões WebSocket otimizado
  - Envio em batches de 50 mensagens para máxima eficiência
  - Monitoramento em tempo real de throughput
  - Análise detalhada de taxa de entrega
- **Métricas**:
  - Taxa de enfileiramento (msgs/s)
  - Taxa de processamento (msgs/s)  
  - Taxa de entrega (%)
  - Latência média, mínima e máxima
- **Veredito**: Avalia se o sistema suporta carga extrema (>95% = Excelente)

## ⚙️ Configuração

### Arquivo de Configuração (`utils/config.js`)

```javascript
const TEST_CONFIG = {
  BASIC_USERS: 100,           // Usuários para teste básico
  BASIC_CONCURRENT: 10,       // Concorrência básica
  CHAT_USERS: 50,            // Usuários para teste de chat
  CHAT_MESSAGES: 100,        // Mensagens por usuário
  // ... outras configurações
}
```

### Variáveis de Ambiente

```bash
# URL da API (padrão: http://localhost:3000/api/v1)
export API_URL=http://localhost:3000/api/v1

# URL do WebSocket (padrão: http://localhost:3000)
export WS_URL=http://localhost:3000

# Timeout para requisições (padrão: 5000ms)
export REQUEST_TIMEOUT=5000
```

## 📈 Métricas Coletadas

### Métricas Básicas
- **Tempo de Resposta**: P50, P95, P99
- **Taxa de Sucesso**: Porcentagem de requisições bem-sucedidas
- **Throughput**: Requisições por segundo
- **Erros**: Contagem e tipos de erro

### Métricas Específicas
- **Autenticação**: Tempo de login/registro
- **WebSocket**: Latência de mensagens em tempo real
- **Concorrência**: Usuários simultâneos suportados
- **Memória/CPU**: Consumo de recursos (quando disponível)

## 🎯 Cenários de Teste

### Warm-up (Aquecimento)
- 30 segundos com carga baixa
- Permite que a aplicação se prepare

### Ramp-up (Aumento Gradual)
- Aumento progressivo da carga
- Identifica pontos de saturação

### Sustained Load (Carga Sustentada)
- Carga constante por período prolongado
- Testa estabilidade do sistema

### Peak Load (Pico de Carga)
- Carga máxima por período curto
- Testa limites do sistema

### Cool-down (Resfriamento)
- Redução gradual da carga
- Verifica recuperação do sistema

## 📋 Interpretação dos Resultados

### ✅ Indicadores de Sucesso
- Taxa de sucesso > 95%
- P95 de tempo de resposta < 2s
- Sem erros de timeout
- Conexões WebSocket estáveis

### ⚠️ Sinais de Alerta
- Taxa de erro > 5%
- P95 > 2s
- Timeouts frequentes
- Desconexões WebSocket

### ❌ Problemas Críticos
- Taxa de erro > 10%
- P95 > 5s
- Falhas de autenticação
- Perda de mensagens

## 🔧 Troubleshooting

### Problemas Comuns

1. **Conexão Recusada**
   ```bash
   # Verifique se a aplicação está rodando
   curl http://localhost:3000/health
   ```

2. **Timeouts**
   ```bash
   # Aumente o timeout nas configurações
   export REQUEST_TIMEOUT=10000
   ```

3. **Limite de Conexões**
   ```bash
   # Verifique limites do sistema
   ulimit -n
   # Aumente se necessário
   ulimit -n 65536
   ```

## 📝 Relatórios

Os testes geram relatórios detalhados incluindo:
- Resumo executivo
- Métricas por endpoint
- Gráficos de performance
- Recomendações de otimização

## 🤝 Contribuindo

Para adicionar novos testes:

1. Crie o arquivo de teste em `/tests/`
2. Adicione o script no `package.json`
3. Documente o cenário testado
4. Inclua métricas relevantes

## 📚 Referências

- [Socket.IO Load Testing](https://socket.io/docs/v4/load-testing/)
- [Node.js Performance Testing](https://nodejs.org/en/docs/guides/simple-profiling/)
- [PNPM Documentation](https://pnpm.io/)
