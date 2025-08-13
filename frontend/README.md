# Frontend - EchoChat

Interface moderna e responsiva para o sistema de chat em tempo real EchoChat, construída com React, TypeScript e tecnologias de ponta.

## 📁 Estrutura do Projeto

```
frontend/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── auth-wrapper.tsx    # Wrapper de autenticação
│   │   ├── protected-route.tsx # Rotas protegidas
│   │   ├── user-menu.tsx      # Menu do usuário
│   │   ├── chat/              # Componentes de chat
│   │   ├── layout/            # Componentes de layout
│   │   └── ui/                # Componentes UI base
│   ├── contexts/            # Contextos React
│   │   ├── auth.context.tsx      # Contexto de autenticação
│   │   ├── chat.context.tsx      # Contexto de chat
│   │   └── user-profile.context.tsx # Contexto de perfil
│   ├── hooks/               # Hooks customizados
│   ├── pages/               # Páginas da aplicação
│   │   ├── _layouts/           # Layouts base
│   │   ├── app/               # Páginas da aplicação
│   │   └── auth/              # Páginas de autenticação
│   ├── services/            # Serviços de API
│   │   ├── auth.service.ts       # Serviços de autenticação
│   │   ├── chat.service.ts       # Serviços de chat
│   │   ├── friends.service.ts    # Serviços de amigos
│   │   ├── rooms.service.ts      # Serviços de salas
│   │   ├── socket.service.ts     # Serviços WebSocket
│   │   └── user.service.ts       # Serviços de usuário
│   ├── lib/                 # Utilitários e configurações
│   ├── assets/              # Assets estáticos
│   ├── App.tsx              # Componente raiz
│   ├── main.tsx             # Ponto de entrada
│   ├── routes.tsx           # Configuração de rotas
│   └── index.css            # Estilos globais
├── public/                  # Arquivos públicos
├── package.json             # Dependências e scripts
├── rspack.config.ts         # Configuração do Rspack
├── tailwind.config.js       # Configuração do Tailwind
├── tsconfig.json            # Configuração TypeScript
└── Dockerfile              # Container Docker
```

## 🛠️ Stack Tecnológica

### **Core**
- **React 19** - Biblioteca para interfaces de usuário
- **TypeScript** - Superset tipado do JavaScript
- **Rspack** - Bundler ultrarrápido baseado em Rust
- **React Router DOM 7** - Roteamento declarativo

### **Estilização**
- **Tailwind CSS 3** - Framework CSS utility-first
- **Tailwind Animate** - Animações com Tailwind
- **PostCSS** - Processamento de CSS
- **Lucide React** - Ícones modernos

### **Formulários & Validação**
- **React Hook Form** - Gerenciamento de formulários performático
- **Zod** - Schema validation TypeScript-first
- **Hookform/Resolvers** - Integração Zod + React Hook Form

### **UI Components**
- **Radix UI** - Componentes acessíveis headless
- **Class Variance Authority** - Variantes de componentes tipadas
- **Clsx** - Utilitário para classes condicionais
- **Tailwind Merge** - Merge inteligente de classes Tailwind

### **Comunicação**
- **Axios** - Cliente HTTP
- **Socket.IO Client** - WebSocket em tempo real
- **React Window** - Virtualização de listas grandes
- **React Window Infinite Loader** - Carregamento infinito otimizado

### **Utilitários**
- **Date-fns** - Manipulação de datas moderna
- **Sonner** - Notificações toast elegantes
- **React Helmet Async** - Gerenciamento de meta tags

## 🚀 Como Executar

### Pré-requisitos

```bash
# Node.js 18+ e PNPM
node --version  # >= 18.0.0
pnpm --version  # >= 8.0.0
```

### Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev

# Aplicação disponível em http://localhost:8080
```

### Build para Produção

```bash
# Gerar build otimizado
pnpm build

# Visualizar build localmente
pnpm preview
```

### Docker

```bash
# Build da imagem
docker build -t echochat-frontend .

# Executar container
docker run -p 80:80 echochat-frontend
```

## 📱 Funcionalidades

### **Autenticação**
- ✅ Login e cadastro de usuários
- ✅ Autenticação JWT com refresh tokens
- ✅ Proteção de rotas privadas
- ✅ Gerenciamento de estado de autenticação
- ✅ Logout automático em caso de token expirado

### **Chat em Tempo Real**
- ✅ Mensagens instantâneas via WebSocket
- ✅ Chat direto entre usuários
- ✅ Salas de chat públicas e privadas
- ✅ Histórico de mensagens
- ✅ Indicadores de status online/offline
- ✅ Virtualização para performance com muitas mensagens

### **Sistema de Amigos**
- ✅ Enviar/aceitar/rejeitar solicitações de amizade
- ✅ Lista de amigos online
- ✅ Buscar e adicionar novos amigos
- ✅ Chat direto com amigos

### **Gerenciamento de Salas**
- ✅ Criar salas públicas e privadas
- ✅ Entrar/sair de salas
- ✅ Lista de participantes
- ✅ Gerenciamento de permissões

### **Perfil do Usuário**
- ✅ Editar informações pessoais
- ✅ Upload de avatar
- ✅ Configurações de privacidade
- ✅ Histórico de atividades

## 🎨 Design System

### **Tema e Cores**
- Sistema de cores baseado em CSS Custom Properties
- Suporte a modo escuro/claro
- Paleta de cores consistente e acessível
- Tokens de design reutilizáveis

### **Componentes**
- **Button**: Variantes (primary, secondary, destructive, ghost)
- **Input**: Campos de entrada com validação visual
- **Label**: Labels acessíveis
- **Textarea**: Áreas de texto redimensionáveis

### **Layout**
- Design responsivo mobile-first
- Grid system flexível
- Componentes de layout reutilizáveis
- Navegação intuitiva

## ⚡ Performance

### **Otimizações**
- **Rspack**: Build ultrarrápido (10x mais rápido que Webpack)
- **React Window**: Virtualização de listas grandes
- **Code Splitting**: Carregamento lazy de rotas
- **Tree Shaking**: Eliminação de código não utilizado
- **Minificação**: CSS e JavaScript otimizados

### **Métricas Alvo**
- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1
- First Input Delay < 100ms

## 🔧 Configuração

### **Variáveis de Ambiente**

```bash
# .env.local
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
VITE_APP_NAME=EchoChat
```

### **Rspack Configuration**

```typescript
// rspack.config.ts
export default defineConfig({
  entry: { main: "./src/main.tsx" },
  output: { publicPath: "/" },
  devServer: { historyApiFallback: true },
  // ... configurações otimizadas
});
```

### **Tailwind Configuration**

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { /* sistema de cores customizado */ },
      animation: { /* animações personalizadas */ }
    }
  }
};
```

## 🏗️ Arquitetura

### **Padrões Utilizados**
- **Component-Based Architecture**: Componentes reutilizáveis e modulares
- **Context + Hooks Pattern**: Gerenciamento de estado global
- **Service Layer**: Abstração da comunicação com APIs
- **Custom Hooks**: Lógica reutilizável encapsulada
- **Compound Components**: Componentes compostos flexíveis

### **Gerenciamento de Estado**
- **React Context**: Estado global (auth, chat, user profile)
- **React Hook Form**: Estado de formulários
- **Local State**: Estado local com useState/useReducer

### **Comunicação**
- **HTTP**: Axios para requisições REST
- **WebSocket**: Socket.IO para comunicação em tempo real
- **Service Layer**: Abstração das chamadas de API

## 🧪 Estrutura de Desenvolvimento

### **TypeScript**
- Configuração strict habilitada
- Types customizados para domínio da aplicação
- Interfaces bem definidas para APIs
- Tipagem completa de props e hooks

### **Code Organization**
- **Barrel Exports**: Exports centralizados
- **Absolute Imports**: Imports absolutos para melhor legibilidade
- **Feature-Based Folders**: Organização por funcionalidade
- **Separation of Concerns**: Responsabilidades bem separadas

## 📊 Monitoramento

### **Métricas de Performance**
- Core Web Vitals tracking
- Bundle size monitoring
- Runtime performance metrics
- Error boundary implementation

### **Debugging**
- React DevTools integration
- Redux DevTools (se necessário)
- Console logging estruturado
- Error tracking e reporting

## 🔒 Segurança

### **Autenticação**
- JWT tokens com refresh automático
- Proteção de rotas sensíveis
- Logout automático em caso de inatividade
- Validação de tokens no frontend

### **Validação**
- Schema validation com Zod
- Sanitização de inputs
- Proteção contra XSS
- Validação client-side + server-side

## 🚀 Deploy

### **Build Otimizado**
```bash
pnpm build
# Gera pasta dist/ com assets otimizados
```


## 📚 Referências

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Rspack Documentation](https://rspack.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Router Documentation](https://reactrouter.com/)
- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)