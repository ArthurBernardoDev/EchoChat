// Configuração base para todos os testes
module.exports = {
  // URL base da API
  BASE_URL: process.env.API_URL || 'http://localhost:3000/api/v1',
  
  // URL base do WebSocket
  WS_URL: process.env.WS_URL || 'http://localhost:3000',
  
  // Configurações de teste
  TEST_CONFIG: {
    // Testes básicos
    BASIC_USERS: 50,
    BASIC_CONCURRENT: 10,
    
    // Testes de chat
    CHAT_USERS: 20,
    CHAT_MESSAGES_PER_USER: 10,
    CHAT_CONCURRENT: 5,
    
    // Testes de amigos
    FRIENDS_USERS: 30,
    FRIENDS_REQUESTS_PER_USER: 5,
    
    // Testes de rooms
    ROOMS_COUNT: 10,
    ROOMS_USERS_PER_ROOM: 15,
    ROOMS_MESSAGES_PER_ROOM: 50,
  },
  
  // Timeouts
  TIMEOUTS: {
    REQUEST: 30000, // 30s
    WEBSOCKET: 5000, // 5s
    BETWEEN_REQUESTS: 100, // 100ms
  }
}
