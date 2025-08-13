#!/usr/bin/env node

const { io } = require('socket.io-client')
const { WS_URL, TEST_CONFIG } = require('../utils/config')
const { sleep } = require('../utils/helpers')
const fs = require('fs')
const path = require('path')

async function testWebSocketStress() {
  console.log('🔌 INICIANDO TESTE DE STRESS WEBSOCKET')
  
  // Carregar usuários e sala do teste anterior
  const usersFile = path.join(__dirname, '../data/test-users.json')
  const roomFile = path.join(__dirname, '../data/test-room.json')
  
  if (!fs.existsSync(usersFile) || !fs.existsSync(roomFile)) {
    console.error('❌ Execute primeiro os testes básicos')
    process.exit(1)
  }
  
  const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'))
  const roomData = JSON.parse(fs.readFileSync(roomFile, 'utf8'))
  const testUsers = users.slice(0, Math.min(15, users.length)) // Limite para WebSocket
  
  console.log(`📊 Configuração:`)
  console.log(`   - Usuários simultâneos: ${testUsers.length}`)
  console.log(`   - Sala: ${roomData.roomName}`)
  console.log(`   - Mensagens por usuário: 10`)
  
  const startTime = Date.now()
  const connections = []
  const metrics = {
    connected: 0,
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
    connectionTimes: []
  }
  
  console.log(`\n1️⃣ FASE 1: CONECTANDO ${testUsers.length} USUÁRIOS`)
  
  // Conectar todos os usuários via WebSocket
  const connectionPromises = testUsers.map((user, index) => {
    return new Promise((resolve) => {
      const connectStart = Date.now()
      
      const socket = io(WS_URL, {
        auth: { token: user.token },
        transports: ['websocket']
      })
      
      socket.on('connect', () => {
        const connectTime = Date.now() - connectStart
        metrics.connectionTimes.push(connectTime)
        metrics.connected++
        console.log(`✅ Usuário ${index + 1}/${testUsers.length} conectado (${connectTime}ms)`)
        
        // Entrar na sala
        socket.emit('join_room', { roomId: roomData.roomId })
        
        connections.push({ socket, user, index })
        resolve()
      })
      
      socket.on('connect_error', (error) => {
        metrics.errors++
        console.error(`❌ Erro de conexão usuário ${index + 1}:`, error.message)
        resolve()
      })
      
      socket.on('new_message', (message) => {
        metrics.messagesReceived++
      })
      
      // Timeout de conexão
      setTimeout(() => {
        if (!socket.connected) {
          metrics.errors++
          console.error(`⏰ Timeout de conexão usuário ${index + 1}`)
          resolve()
        }
      }, 10000)
    })
  })
  
  await Promise.all(connectionPromises)
  
  console.log(`\n📊 Conexões estabelecidas: ${metrics.connected}/${testUsers.length}`)
  
  if (connections.length === 0) {
    console.error('❌ Nenhuma conexão estabelecida!')
    process.exit(1)
  }
  
  await sleep(2000)
  
  console.log(`\n2️⃣ FASE 2: STRESS TEST DE MENSAGENS`)
  
  // Cada usuário conectado envia mensagens rapidamente
  const messagingPromises = connections.map(({ socket, user, index }) => {
    return new Promise(async (resolve) => {
      for (let i = 0; i < 10; i++) {
        try {
          socket.emit('send_message', {
            roomId: roomData.roomId,
            content: `Mensagem de stress ${i + 1} de ${user.username} (${Date.now()})`
          })
          metrics.messagesSent++
          
          // Pequeno delay entre mensagens
          await sleep(100 + Math.random() * 200)
        } catch (error) {
          metrics.errors++
          console.error(`❌ Erro ao enviar mensagem (usuário ${index + 1}):`, error)
        }
      }
      resolve()
    })
  })
  
  await Promise.all(messagingPromises)
  
  console.log(`\n3️⃣ FASE 3: TESTE DE TYPING INDICATORS`)
  
  // Simular vários usuários digitando ao mesmo tempo
  const typingPromises = connections.map(({ socket, user, index }) => {
    return new Promise(async (resolve) => {
      try {
        // Começar a digitar
        socket.emit('typing_start', { roomId: roomData.roomId })
        await sleep(2000)
        
        // Parar de digitar
        socket.emit('typing_stop', { roomId: roomData.roomId })
        await sleep(1000)
        
        resolve()
      } catch (error) {
        metrics.errors++
        console.error(`❌ Erro no typing (usuário ${index + 1}):`, error)
        resolve()
      }
    })
  })
  
  await Promise.all(typingPromises)
  
  await sleep(3000) // Aguardar mensagens chegarem
  
  console.log(`\n4️⃣ FASE 4: DESCONECTANDO USUÁRIOS`)
  
  // Desconectar todos
  connections.forEach(({ socket, index }) => {
    socket.disconnect()
    console.log(`👋 Usuário ${index + 1} desconectado`)
  })
  
  // Relatório final
  const totalDuration = Date.now() - startTime
  const avgConnectionTime = metrics.connectionTimes.length > 0 
    ? metrics.connectionTimes.reduce((a, b) => a + b, 0) / metrics.connectionTimes.length 
    : 0
  
  console.log(`\n🎯 RESUMO FINAL DO TESTE WEBSOCKET`)
  console.log(`⏱️  Duração total: ${totalDuration}ms`)
  console.log(`🔌 Conexões: ${metrics.connected}/${testUsers.length} (${(metrics.connected/testUsers.length*100).toFixed(1)}%)`)
  console.log(`⚡ Tempo médio de conexão: ${avgConnectionTime.toFixed(0)}ms`)
  console.log(`📤 Mensagens enviadas: ${metrics.messagesSent}`)
  console.log(`📥 Mensagens recebidas: ${metrics.messagesReceived}`)
  console.log(`❌ Erros: ${metrics.errors}`)
  console.log(`📊 Taxa de entrega: ${metrics.messagesSent > 0 ? (metrics.messagesReceived/metrics.messagesSent*100).toFixed(1) : 0}%`)
  
  return {
    totalDuration,
    connections: metrics.connected,
    messagesSent: metrics.messagesSent,
    messagesReceived: metrics.messagesReceived,
    errors: metrics.errors,
    avgConnectionTime
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testWebSocketStress()
    .then(() => {
      console.log('\n✅ Teste de WebSocket concluído!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Erro no teste de WebSocket:', error)
      process.exit(1)
    })
}

module.exports = { testWebSocketStress }
