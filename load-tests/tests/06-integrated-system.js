#!/usr/bin/env node

const { 
  generateUser, 
  registerUser, 
  loginUser, 
  runConcurrent, 
  generateReport,
  sleep,
  measureTime,
  authenticatedRequest
} = require('../utils/helpers')
const { BASE_URL, TIMEOUTS } = require('../utils/config')
const { faker } = require('@faker-js/faker')
const io = require('socket.io-client')

// Configuração do teste integrado
const INTEGRATED_CONFIG = {
  TOTAL_USERS: 100,
  CONCURRENT_USERS: 20,
  GROUPS_TO_CREATE: 10,
  MESSAGES_PER_USER: 15,
  FRIEND_REQUESTS_PER_USER: 8,
  WEBSOCKET_DURATION: 60000, // 1 minuto de teste WebSocket
  REALISTIC_DELAYS: true
}

class UserSimulator {
  constructor(userData) {
    this.user = userData
    this.token = userData.token
    this.socket = null
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      friendRequestsSent: 0,
      friendRequestsReceived: 0,
      groupsJoined: 0,
      errors: []
    }
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.socket = io(`${BASE_URL.replace('/api/v1', '')}`, {
        auth: { token: this.token },
        transports: ['websocket']
      })

      this.socket.on('connect', () => {
        console.log(`🔌 ${this.user.username} conectado via WebSocket`)
        resolve()
      })

      this.socket.on('message', (data) => {
        this.stats.messagesReceived++
      })

      this.socket.on('friend_request', (data) => {
        this.stats.friendRequestsReceived++
      })

      this.socket.on('error', (error) => {
        this.stats.errors.push(`WebSocket: ${error}`)
      })

      this.socket.on('connect_error', (error) => {
        reject(error)
      })

      setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000)
    })
  }

  async sendMessage(roomId, content) {
    try {
      const response = await authenticatedRequest(
        this.token, 
        'POST', 
        `/chat/rooms/${roomId}/messages`,
        { content }
      )
      if (response.success) {
        this.stats.messagesSent++
      }
      return response
    } catch (error) {
      this.stats.errors.push(`Send message: ${error.message}`)
      return { success: false, error }
    }
  }

  async sendFriendRequest(username) {
    try {
      const response = await authenticatedRequest(
        this.token,
        'POST',
        '/friends/request',
        { username }
      )
      if (response.success) {
        this.stats.friendRequestsSent++
      }
      return response
    } catch (error) {
      this.stats.errors.push(`Friend request: ${error.message}`)
      return { success: false, error }
    }
  }

  async joinGroup(roomId) {
    try {
      const response = await authenticatedRequest(
        this.token,
        'POST',
        `/rooms/${roomId}/join`
      )
      if (response.success) {
        this.stats.groupsJoined++
      }
      return response
    } catch (error) {
      this.stats.errors.push(`Join group: ${error.message}`)
      return { success: false, error }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}

async function testIntegratedSystem() {
  console.log('🌐 INICIANDO TESTE INTEGRADO DO SISTEMA')
  console.log(`📊 Configuração:`)
  console.log(`   - Usuários simultâneos: ${INTEGRATED_CONFIG.TOTAL_USERS}`)
  console.log(`   - Concorrência: ${INTEGRATED_CONFIG.CONCURRENT_USERS}`)
  console.log(`   - Grupos a criar: ${INTEGRATED_CONFIG.GROUPS_TO_CREATE}`)
  console.log(`   - Mensagens por usuário: ${INTEGRATED_CONFIG.MESSAGES_PER_USER}`)
  console.log(`   - Solicitações de amizade: ${INTEGRATED_CONFIG.FRIEND_REQUESTS_PER_USER}`)
  console.log(`   - Duração WebSocket: ${INTEGRATED_CONFIG.WEBSOCKET_DURATION/1000}s`)

  const startTime = Date.now()
  let allUsers = []
  let simulators = []
  let createdGroups = []

  // FASE 1: REGISTRO E LOGIN
  console.log(`\n1️⃣ FASE 1: PREPARAÇÃO DE ${INTEGRATED_CONFIG.TOTAL_USERS} USUÁRIOS`)
  
  const users = Array.from({ length: INTEGRATED_CONFIG.TOTAL_USERS }, generateUser)
  
  // Registro em paralelo
  const registerTasks = users.map(user => () => measureTime(() => registerUser(user)))
  const registerResults = await runConcurrent(registerTasks, INTEGRATED_CONFIG.CONCURRENT_USERS)
  
  const registeredUsers = registerResults
    .filter(r => r.success && r.data?.success)
    .map((r, i) => users[r.index || i])
  
  console.log(`✅ ${registeredUsers.length}/${users.length} usuários registrados`)
  
  // Login em paralelo
  const loginTasks = registeredUsers.map(user => () => 
    measureTime(() => loginUser({ username: user.username, password: user.password }))
  )
  const loginResults = await runConcurrent(loginTasks, INTEGRATED_CONFIG.CONCURRENT_USERS)
  
  // Criar simuladores de usuário
  loginResults.forEach((result, index) => {
    if (result.success && result.data?.success && result.data?.data?.accessToken) {
      const userData = {
        ...registeredUsers[index],
        token: result.data.data.accessToken
      }
      allUsers.push(userData)
      simulators.push(new UserSimulator(userData))
    }
  })
  
  console.log(`✅ ${allUsers.length} usuários logados e prontos`)

  // FASE 2: CRIAÇÃO DE GRUPOS PÚBLICOS
  console.log(`\n2️⃣ FASE 2: CRIAÇÃO DE ${INTEGRATED_CONFIG.GROUPS_TO_CREATE} GRUPOS PÚBLICOS`)
  
  const groupCreators = simulators.slice(0, INTEGRATED_CONFIG.GROUPS_TO_CREATE)
  const createGroupTasks = groupCreators.map(simulator => () => 
    measureTime(async () => {
      const groupName = faker.company.name()
      const response = await authenticatedRequest(
        simulator.token,
        'POST',
        '/rooms',
        {
          name: groupName,
          description: `Grupo de teste: ${groupName}`,
          isPrivate: false
        }
      )
      return response
    })
  )
  
  const groupResults = await runConcurrent(createGroupTasks, 5)
  
  groupResults.forEach(result => {
    if (result.success && result.data?.success) {
      createdGroups.push(result.data.data)
    }
  })
  
  console.log(`✅ ${createdGroups.length} grupos criados`)

  // FASE 3: CONEXÕES WEBSOCKET
  console.log(`\n3️⃣ FASE 3: CONECTANDO ${simulators.length} USUÁRIOS VIA WEBSOCKET`)
  
  const connectionTasks = simulators.map(simulator => () => 
    measureTime(() => simulator.connectWebSocket())
  )
  
  const connectionResults = await runConcurrent(connectionTasks, 10)
  const connectedUsers = connectionResults.filter(r => r.success).length
  
  console.log(`✅ ${connectedUsers}/${simulators.length} usuários conectados via WebSocket`)

  // FASE 4: USUÁRIOS ENTRANDO EM GRUPOS
  console.log(`\n4️⃣ FASE 4: USUÁRIOS ENTRANDO EM GRUPOS`)
  
  const joinTasks = []
  simulators.forEach(simulator => {
    // Cada usuário entra em 2-3 grupos aleatórios
    const groupsToJoin = faker.helpers.arrayElements(createdGroups, Math.floor(Math.random() * 3) + 1)
    groupsToJoin.forEach(group => {
      joinTasks.push(() => measureTime(() => simulator.joinGroup(group.id)))
    })
  })
  
  const joinResults = await runConcurrent(joinTasks, INTEGRATED_CONFIG.CONCURRENT_USERS)
  const successfulJoins = joinResults.filter(r => r.success).length
  
  console.log(`✅ ${successfulJoins} entradas em grupos realizadas`)

  // FASE 5: SISTEMA DE AMIGOS
  console.log(`\n5️⃣ FASE 5: SISTEMA DE AMIGOS`)
  
  const friendTasks = []
  simulators.forEach(simulator => {
    // Cada usuário envia solicitações para usuários aleatórios
    const targets = faker.helpers.arrayElements(
      allUsers.filter(u => u.username !== simulator.user.username),
      Math.min(INTEGRATED_CONFIG.FRIEND_REQUESTS_PER_USER, allUsers.length - 1)
    )
    
    targets.forEach(target => {
      friendTasks.push(() => measureTime(() => simulator.sendFriendRequest(target.username)))
    })
  })
  
  const friendResults = await runConcurrent(friendTasks, INTEGRATED_CONFIG.CONCURRENT_USERS)
  const successfulFriendRequests = friendResults.filter(r => r.success).length
  
  console.log(`✅ ${successfulFriendRequests} solicitações de amizade enviadas`)

  // FASE 6: CHAT EM TEMPO REAL
  console.log(`\n6️⃣ FASE 6: CHAT EM TEMPO REAL (${INTEGRATED_CONFIG.WEBSOCKET_DURATION/1000}s)`)
  
  const chatStartTime = Date.now()
  let totalMessagesSent = 0
  let totalMessagesReceived = 0
  
  // Simular chat ativo por 1 minuto
  const chatInterval = setInterval(async () => {
    // Selecionar usuários aleatórios para enviar mensagens
    const activeUsers = faker.helpers.arrayElements(simulators, Math.floor(simulators.length * 0.3))
    
    const messageTasks = activeUsers.map(simulator => () => {
      const group = faker.helpers.arrayElement(createdGroups)
      const message = faker.lorem.sentence()
      return measureTime(() => simulator.sendMessage(group.id, message))
    })
    
    const messageResults = await runConcurrent(messageTasks, 10)
    const sentCount = messageResults.filter(r => r.success).length
    totalMessagesSent += sentCount
    
    // Contar mensagens recebidas
    const receivedCount = simulators.reduce((sum, sim) => sum + sim.stats.messagesReceived, 0)
    totalMessagesReceived = receivedCount
    
    console.log(`💬 ${sentCount} mensagens enviadas | ${receivedCount} recebidas`)
  }, 2000) // Enviar mensagens a cada 2 segundos
  
  // Aguardar duração do teste
  await sleep(INTEGRATED_CONFIG.WEBSOCKET_DURATION)
  clearInterval(chatInterval)
  
  console.log(`✅ Chat em tempo real concluído`)

  // FASE 7: TESTE DE STRESS FINAL
  console.log(`\n7️⃣ FASE 7: STRESS FINAL - MÚLTIPLAS OPERAÇÕES SIMULTÂNEAS`)
  
  const stressTasks = []
  
  // Cada usuário faz múltiplas operações simultaneamente
  simulators.forEach(simulator => {
    // Buscar perfil
    stressTasks.push(() => measureTime(() => 
      authenticatedRequest(simulator.token, 'GET', '/auth/profile')
    ))
    
    // Buscar amigos
    stressTasks.push(() => measureTime(() => 
      authenticatedRequest(simulator.token, 'GET', '/friends')
    ))
    
    // Buscar salas
    stressTasks.push(() => measureTime(() => 
      authenticatedRequest(simulator.token, 'GET', '/rooms')
    ))
    
    // Buscar grupos públicos
    stressTasks.push(() => measureTime(() => 
      authenticatedRequest(simulator.token, 'GET', '/rooms/search/public?search=test')
    ))
  })
  
  const stressResults = await runConcurrent(stressTasks, INTEGRATED_CONFIG.CONCURRENT_USERS * 2)
  const stressSuccessful = stressResults.filter(r => r.success).length
  
  console.log(`✅ ${stressSuccessful}/${stressTasks.length} operações de stress bem-sucedidas`)

  // FASE 8: DESCONEXÃO E ESTATÍSTICAS
  console.log(`\n8️⃣ FASE 8: DESCONECTANDO E COLETANDO ESTATÍSTICAS`)
  
  // Desconectar todos os WebSockets
  simulators.forEach(simulator => simulator.disconnect())
  
  // Coletar estatísticas finais
  const totalStats = simulators.reduce((acc, sim) => ({
    messagesReceived: acc.messagesReceived + sim.stats.messagesReceived,
    messagesSent: acc.messagesSent + sim.stats.messagesSent,
    friendRequestsSent: acc.friendRequestsSent + sim.stats.friendRequestsSent,
    friendRequestsReceived: acc.friendRequestsReceived + sim.stats.friendRequestsReceived,
    groupsJoined: acc.groupsJoined + sim.stats.groupsJoined,
    totalErrors: acc.totalErrors + sim.stats.errors.length
  }), {
    messagesReceived: 0,
    messagesSent: 0,
    friendRequestsSent: 0,
    friendRequestsReceived: 0,
    groupsJoined: 0,
    totalErrors: 0
  })
  
  const totalDuration = Date.now() - startTime
  
  // RELATÓRIO FINAL DETALHADO
  console.log(`\n🎯 RELATÓRIO FINAL - TESTE INTEGRADO DO SISTEMA`)
  console.log(`⏱️  Duração total: ${(totalDuration / 1000 / 60).toFixed(2)} minutos`)
  console.log(`👥 Usuários ativos: ${allUsers.length}`)
  console.log(`🔌 Conexões WebSocket: ${connectedUsers}/${simulators.length} (${(connectedUsers/simulators.length*100).toFixed(1)}%)`)
  console.log(`🏠 Grupos criados: ${createdGroups.length}`)
  console.log(`📊 Entradas em grupos: ${totalStats.groupsJoined}`)
  console.log(`👫 Solicitações enviadas: ${totalStats.friendRequestsSent}`)
  console.log(`📨 Solicitações recebidas: ${totalStats.friendRequestsReceived}`)
  console.log(`📤 Mensagens enviadas: ${totalStats.messagesSent}`)
  console.log(`📥 Mensagens recebidas: ${totalStats.messagesReceived}`)
  console.log(`⚡ Taxa de entrega: ${totalStats.messagesReceived > 0 ? (totalStats.messagesReceived/totalStats.messagesSent*100).toFixed(1) : 0}%`)
  console.log(`❌ Total de erros: ${totalStats.totalErrors}`)
  
  // Análise de performance
  console.log(`\n📈 ANÁLISE DE PERFORMANCE:`)
  console.log(`🔄 Operações por segundo: ${((totalStats.messagesSent + totalStats.friendRequestsSent + totalStats.groupsJoined) / (totalDuration / 1000)).toFixed(1)}`)
  console.log(`💬 Mensagens por minuto: ${(totalStats.messagesSent / (totalDuration / 1000 / 60)).toFixed(0)}`)
  console.log(`🌐 Eficiência WebSocket: ${totalStats.messagesReceived > 0 ? 'EXCELENTE' : 'PRECISA VERIFICAÇÃO'}`)
  
  // Salvar estatísticas detalhadas
  const detailedStats = {
    timestamp: new Date().toISOString(),
    config: INTEGRATED_CONFIG,
    results: {
      totalDuration,
      usersActive: allUsers.length,
      websocketConnections: connectedUsers,
      groupsCreated: createdGroups.length,
      ...totalStats
    },
    performance: {
      operationsPerSecond: (totalStats.messagesSent + totalStats.friendRequestsSent + totalStats.groupsJoined) / (totalDuration / 1000),
      messagesPerMinute: totalStats.messagesSent / (totalDuration / 1000 / 60),
      deliveryRate: totalStats.messagesReceived > 0 ? (totalStats.messagesReceived/totalStats.messagesSent) : 0
    }
  }
  
  const fs = require('fs')
  const path = require('path')
  
  fs.writeFileSync(
    path.join(__dirname, '../data/integrated-test-stats.json'),
    JSON.stringify(detailedStats, null, 2)
  )
  
  return detailedStats
}

// Executar se chamado diretamente
if (require.main === module) {
  console.log(`🚨 TESTE INTEGRADO DO SISTEMA COMPLETO`)
  console.log(`⏳ Tempo estimado: 3-5 minutos`)
  console.log(`🔌 Inclui: WebSocket, Chat, Amigos, Grupos`)
  
  testIntegratedSystem()
    .then(stats => {
      console.log('\n🎉 TESTE INTEGRADO CONCLUÍDO!')
      console.log(`📊 Estatísticas detalhadas salvas em integrated-test-stats.json`)
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Erro no teste integrado:', error.message)
      process.exit(1)
    })
}

module.exports = { testIntegratedSystem }
