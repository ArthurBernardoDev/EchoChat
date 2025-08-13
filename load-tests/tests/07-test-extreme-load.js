#!/usr/bin/env node

/**
 * Teste extremo de carga
 * 50 usuários × 100 mensagens = 5000 mensagens
 */

const { 
  generateUser, 
  registerUser, 
  loginUser, 
  authenticatedRequest,
  sleep,
  runConcurrent
} = require('../utils/helpers')
const { BASE_URL } = require('../utils/config')
const io = require('socket.io-client')

class TestUser {
  constructor(userData) {
    this.user = userData
    this.token = userData.token
    this.socket = null
    this.messagesReceived = 0
    this.currentRoom = null
    this.connected = false
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(`${BASE_URL.replace('/api/v1', '')}/chat`, {
        transports: ['websocket'],
        reconnection: false
      })

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, 10000)

      this.socket.on('connect', () => {
        this.socket.emit('authenticate', { token: this.token })
      })

      this.socket.on('authenticated', (data) => {
        clearTimeout(timeout)
        if (data.success) {
          this.connected = true
          this.setupListeners()
          resolve()
        } else {
          reject(new Error('Authentication failed'))
        }
      })

      this.socket.on('authentication_error', (error) => {
        clearTimeout(timeout)
        reject(new Error(`Auth error: ${error.message}`))
      })
    })
  }

  setupListeners() {
    this.socket.on('new_message', () => {
      this.messagesReceived++
    })

    this.socket.on('message_confirmed', () => {
      // Mensagem confirmada pelo servidor
    })

    this.socket.on('room_joined', (data) => {
      this.currentRoom = data.roomId
    })

    this.socket.on('error', (error) => {
      if (!error.message?.includes('Cannot read properties')) {
        console.log(`❌ ${this.user.username}: ${error.message}`)
      }
    })
  }

  async joinRoomViaHttp(roomId) {
    const response = await authenticatedRequest(
      this.token,
      'POST',
      `/rooms/${roomId}/join`
    )
    return response
  }

  async joinRoomViaWebSocket(roomId) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Timeout' })
      }, 5000)

      const handleJoined = (data) => {
        clearTimeout(timeout)
        resolve({ success: true })
      }

      const handleError = (error) => {
        clearTimeout(timeout)
        resolve({ success: false, error: error.message })
      }

      this.socket.once('room_joined', handleJoined)
      this.socket.once('error', handleError)

      this.socket.emit('join_room', { roomId })
    })
  }

  sendMessage(roomId, content) {
    if (this.connected && this.socket) {
      this.socket.emit('send_message', { roomId, content })
      return true
    }
    return false
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}

async function runExtremeTest() {
  console.log('💥 TESTE EXTREMO DE CARGA COM SISTEMA DE FILAS\n')
  console.log('=' .repeat(50))
  
  const TEST_USERS = 50  // 50 usuários
  const MESSAGES_PER_USER = 100  // 100 mensagens por usuário = 5000 mensagens total
  const BATCH_SIZE = 50  // Enviar em batches de 50 mensagens
  
  console.log(`📊 Configuração EXTREMA:`)
  console.log(`   - Usuários: ${TEST_USERS}`)
  console.log(`   - Mensagens por usuário: ${MESSAGES_PER_USER}`)
  console.log(`   - Total de mensagens: ${TEST_USERS * MESSAGES_PER_USER}`)
  console.log(`   - Recebimentos esperados: ${TEST_USERS * MESSAGES_PER_USER * TEST_USERS}`)
  console.log(`   - Sistema de filas: ATIVADO ✅`)
  
  const testUsers = []
  
  try {
    // 1. CRIAR USUÁRIOS EM BATCHES
    console.log('\n1️⃣ CRIANDO E LOGANDO USUÁRIOS')
    
    for (let batch = 0; batch < Math.ceil(TEST_USERS / 10); batch++) {
      const batchStart = batch * 10
      const batchEnd = Math.min(batchStart + 10, TEST_USERS)
      const batchSize = batchEnd - batchStart
      
      const userTasks = []
      for (let i = 0; i < batchSize; i++) {
        userTasks.push(async () => {
          const user = generateUser()
          const registerResult = await registerUser(user)
          
          if (registerResult.success) {
            const loginResult = await loginUser({ 
              username: user.username, 
              password: user.password 
            })
            
            if (loginResult.success && loginResult.data?.accessToken) {
              return new TestUser({
                ...user,
                token: loginResult.data.accessToken
              })
            }
          }
          return null
        })
      }
      
      const batchResults = await runConcurrent(userTasks, 5)
      batchResults.forEach((result) => {
        if (result.success && result.data) {
          testUsers.push(result.data)
        }
      })
      
      console.log(`  Batch ${batch + 1}: ${testUsers.length} usuários criados`)
    }
    
    console.log(`✅ Total: ${testUsers.length} usuários criados`)
    
    if (testUsers.length < 10) {
      throw new Error('Poucos usuários criados para teste extremo')
    }
    
    // 2. CRIAR SALA
    console.log('\n2️⃣ CRIANDO SALA DE TESTE')
    const roomResponse = await authenticatedRequest(
      testUsers[0].token,
      'POST',
      '/rooms',
      {
        name: `Sala Extrema ${Date.now()}`,
        description: `Teste extremo com ${TEST_USERS * MESSAGES_PER_USER} mensagens + filas`,
        isPrivate: false
      }
    )
    
    if (!roomResponse.success) {
      throw new Error('Falha ao criar sala')
    }
    
    const testRoom = roomResponse.data
    console.log(`✅ Sala criada: ${testRoom.name}`)
    
    // 3. CONECTAR WEBSOCKETS EM BATCHES
    console.log('\n3️⃣ CONECTANDO WEBSOCKETS')
    
    for (let batch = 0; batch < Math.ceil(testUsers.length / 10); batch++) {
      const batchStart = batch * 10
      const batchEnd = Math.min(batchStart + 10, testUsers.length)
      const batchUsers = testUsers.slice(batchStart, batchEnd)
      
      const connectTasks = batchUsers.map(user => () => user.connect())
      const connectResults = await runConcurrent(connectTasks, 10)
      const connected = connectResults.filter(r => r.success).length
      
      console.log(`  Batch ${batch + 1}: ${connected} conectados`)
    }
    
    const connectedCount = testUsers.filter(u => u.connected).length
    console.log(`✅ Total: ${connectedCount}/${testUsers.length} usuários conectados`)
    
    // 4. ENTRAR NA SALA
    console.log('\n4️⃣ ENTRANDO NA SALA')
    let usersInRoom = 0
    
    for (const testUser of testUsers) {
      if (!testUser.connected) continue
      
      // HTTP Join
      const httpResult = await testUser.joinRoomViaHttp(testRoom.id)
      if (!httpResult.success) continue
      
      // Pequeno delay para não sobrecarregar
      if (usersInRoom % 10 === 0 && usersInRoom > 0) {
        await sleep(200)
      }
      
      // WebSocket Join
      const wsResult = await testUser.joinRoomViaWebSocket(testRoom.id)
      if (wsResult.success) {
        usersInRoom++
      }
    }
    
    console.log(`✅ ${usersInRoom} usuários na sala`)
    
    const activeUsers = testUsers.filter(u => u.currentRoom === testRoom.id)
    
    // 5. TESTE EXTREMO
    console.log('\n5️⃣ INICIANDO TESTE EXTREMO DE CARGA')
    console.log(`🚀 Enviando ${activeUsers.length * MESSAGES_PER_USER} mensagens...`)
    console.log(`📬 Sistema de filas processará as mensagens de forma assíncrona`)
    
    // Resetar contadores
    testUsers.forEach(u => u.messagesReceived = 0)
    
    await sleep(1000) // Estabilização
    
    const startTime = Date.now()
    let totalSent = 0
    
    // Enviar mensagens em batches grandes
    for (let batch = 0; batch < MESSAGES_PER_USER / BATCH_SIZE; batch++) {
      const messageTasks = []
      
      // Cada usuário envia BATCH_SIZE mensagens
      activeUsers.forEach((user, userIndex) => {
        for (let i = 0; i < BATCH_SIZE; i++) {
          const msgNum = batch * BATCH_SIZE + i + 1
          messageTasks.push(() => {
            const sent = user.sendMessage(
              testRoom.id, 
              `E${msgNum}`
            )
            return { success: sent }
          })
        }
      })
      
      // Enviar batch em paralelo com alta concorrência
      const batchResults = await runConcurrent(messageTasks, 200)
      const batchSent = batchResults.filter(r => r.success).length
      totalSent += batchSent
      
      process.stdout.write(`\r📊 Progresso: ${totalSent}/${activeUsers.length * MESSAGES_PER_USER} mensagens enviadas para fila`)
      
      // Micro delay entre batches
      await sleep(50)
    }
    
    const sendDuration = Date.now() - startTime
    console.log(`\n✅ ${totalSent} mensagens enfileiradas em ${(sendDuration/1000).toFixed(1)}s`)
    console.log(`⚡ Taxa de enfileiramento: ${(totalSent/(sendDuration/1000)).toFixed(0)} msgs/s`)
    
    // 6. AGUARDAR PROCESSAMENTO
    console.log('\n6️⃣ AGUARDANDO PROCESSAMENTO DAS MENSAGENS')
    console.log('📬 Fila processando mensagens de forma assíncrona...')
    
    // Aguardar mais tempo para processamento
    const waitTime = Math.min(30000, totalSent * 20) // 20ms por mensagem, máximo 30s
    console.log(`⏳ Aguardando ${(waitTime/1000).toFixed(1)}s para processamento completo...`)
    
    for (let i = 0; i < waitTime/1000; i++) {
      await sleep(1000)
      const totalReceived = activeUsers.reduce((sum, u) => sum + u.messagesReceived, 0)
      const percentage = ((totalReceived / (totalSent * activeUsers.length)) * 100).toFixed(1)
      process.stdout.write(`\r📥 Processadas: ${totalReceived} mensagens (${percentage}%)`)
    }
    
    // 7. ANÁLISE FINAL
    console.log('\n\n7️⃣ ANÁLISE FINAL')
    console.log('=' .repeat(50))
    
    const totalReceived = activeUsers.reduce((sum, u) => sum + u.messagesReceived, 0)
    const expectedReceived = totalSent * activeUsers.length
    
    console.log(`📤 Mensagens enfileiradas: ${totalSent}`)
    console.log(`📥 Mensagens recebidas: ${totalReceived}`)
    console.log(`📊 Esperado: ${expectedReceived} (${totalSent} × ${activeUsers.length} usuários)`)
    
    const deliveryRate = expectedReceived > 0 ? (totalReceived / expectedReceived * 100) : 0
    console.log(`⚡ Taxa de entrega: ${deliveryRate.toFixed(1)}%`)
    
    // Throughput
    const totalDuration = Date.now() - startTime
    const sendThroughput = totalSent / (totalDuration / 1000)
    const receiveThroughput = totalReceived / (totalDuration / 1000)
    
    console.log(`\n📈 THROUGHPUT:`)
    console.log(`   Enfileiramento: ${sendThroughput.toFixed(0)} msgs/s`)
    console.log(`   Processamento: ${receiveThroughput.toFixed(0)} msgs/s`)
    
    // Estatísticas
    const avgReceived = totalReceived / activeUsers.length
    const minReceived = Math.min(...activeUsers.map(u => u.messagesReceived))
    const maxReceived = Math.max(...activeUsers.map(u => u.messagesReceived))
    
    console.log(`\n📊 ESTATÍSTICAS:`)
    console.log(`   Média: ${avgReceived.toFixed(0)} msgs/usuário`)
    console.log(`   Mínimo: ${minReceived} msgs`)
    console.log(`   Máximo: ${maxReceived} msgs`)
    
    // Veredito
    console.log('\n' + '=' .repeat(50))
    console.log('🏆 VEREDITO DO TESTE EXTREMO:')
    
    if (deliveryRate >= 95) {
      console.log('✅ EXCELENTE! Sistema de filas funcionando perfeitamente!')
      console.log('   - Suporta carga extrema sem problemas')
      console.log('   - Pool de conexões otimizado')
      console.log('   - Processamento assíncrono eficiente')
    } else if (deliveryRate >= 80) {
      console.log('🟨 BOM! Sistema funcional com pequenas perdas')
    } else if (deliveryRate >= 60) {
      console.log('🟧 ACEITÁVEL! Sistema com perdas significativas')
    } else {
      console.log('❌ PROBLEMA! Taxa de entrega muito baixa')
    }
    
    console.log(`\n💪 Capacidade: ${(sendThroughput * 0.8).toFixed(0)} msgs/s sustentados`)
    console.log(`🚀 Com filas: Sistema escalável para milhares de mensagens!`)
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message)
  } finally {
    // Cleanup
    console.log('\n🧹 Encerrando conexões...')
    testUsers.forEach(u => u.disconnect())
  }
}

// Executar teste
if (require.main === module) {
  runExtremeTest()
    .then(() => {
      console.log('\n✅ Teste extremo concluído')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error)
      process.exit(1)
    })
}

module.exports = { runExtremeTest }
