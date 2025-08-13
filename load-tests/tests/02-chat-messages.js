#!/usr/bin/env node

const { 
  authenticatedRequest, 
  generateRoom,
  runConcurrent, 
  generateReport,
  sleep 
} = require('../utils/helpers')
const { TEST_CONFIG } = require('../utils/config')
const { faker } = require('@faker-js/faker')
const fs = require('fs')
const path = require('path')

async function testChatMessages() {
  console.log('💬 INICIANDO TESTE DE MENSAGENS DE CHAT')
  
  // Carregar usuários do teste anterior
  const usersFile = path.join(__dirname, '../data/test-users.json')
  if (!fs.existsSync(usersFile)) {
    console.error('❌ Execute primeiro o teste básico: npm run test:basic')
    process.exit(1)
  }
  
  const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'))
  const testUsers = users.slice(0, TEST_CONFIG.CHAT_USERS)
  
  console.log(`📊 Configuração:`)
  console.log(`   - Usuários: ${testUsers.length}`)
  console.log(`   - Mensagens por usuário: ${TEST_CONFIG.CHAT_MESSAGES_PER_USER}`)
  console.log(`   - Concorrência: ${TEST_CONFIG.CHAT_CONCURRENT}`)
  
  const startTime = Date.now()
  
  console.log(`\n1️⃣ FASE 1: CRIAÇÃO DE SALA DE TESTE`)
  
  // Criar uma sala pública para testes
  const roomData = generateRoom()
  const roomResult = await authenticatedRequest(
    testUsers[0].token, 
    'POST', 
    '/rooms', 
    { ...roomData, isPrivate: false }
  )
  
  if (!roomResult.success) {
    console.error('❌ Falha ao criar sala de teste:', roomResult.error)
    process.exit(1)
  }
  
  const roomId = roomResult.data.id
  console.log(`✅ Sala criada: ${roomData.name} (${roomId})`)
  
  console.log(`\n2️⃣ FASE 2: USUÁRIOS ENTRANDO NA SALA`)
  
  // Todos os usuários entram na sala
  const joinTasks = testUsers.map(user => () => 
    authenticatedRequest(user.token, 'POST', `/rooms/${roomId}/join`)
  )
  const joinResults = await runConcurrent(joinTasks, TEST_CONFIG.CHAT_CONCURRENT)
  
  const joinReport = generateReport('ENTRADA NA SALA', joinResults, Date.now())
  
  const joinedUsers = testUsers.filter((_, i) => joinResults[i]?.success)
  console.log(`✅ Usuários que entraram na sala: ${joinedUsers.length}`)
  
  await sleep(1000)
  
  console.log(`\n3️⃣ FASE 3: ENVIO DE MENSAGENS EM MASSA`)
  
  // Cada usuário envia várias mensagens
  const messageTasks = []
  joinedUsers.forEach(user => {
    for (let i = 0; i < TEST_CONFIG.CHAT_MESSAGES_PER_USER; i++) {
      messageTasks.push(() => 
        authenticatedRequest(user.token, 'POST', '/chat/messages', {
          roomId,
          content: `${faker.lorem.sentence()} (${user.username} - msg ${i+1})`
        })
      )
    }
  })
  
  const messageResults = await runConcurrent(messageTasks, TEST_CONFIG.CHAT_CONCURRENT)
  const messageReport = generateReport('ENVIO DE MENSAGENS', messageResults, Date.now())
  
  console.log(`\n4️⃣ FASE 4: BUSCA DE MENSAGENS`)
  
  // Cada usuário busca mensagens da sala
  const fetchTasks = joinedUsers.map(user => () => 
    authenticatedRequest(user.token, 'GET', `/chat/rooms/${roomId}/messages?limit=50`)
  )
  const fetchResults = await runConcurrent(fetchTasks, TEST_CONFIG.CHAT_CONCURRENT)
  
  const fetchReport = generateReport('BUSCA DE MENSAGENS', fetchResults, Date.now())
  
  console.log(`\n5️⃣ FASE 5: CONTAGEM DE MENSAGENS NÃO LIDAS`)
  
  // Cada usuário verifica mensagens não lidas
  const unreadTasks = joinedUsers.map(user => () => 
    authenticatedRequest(user.token, 'GET', `/chat/rooms/${roomId}/unread-count`)
  )
  const unreadResults = await runConcurrent(unreadTasks, TEST_CONFIG.CHAT_CONCURRENT)
  
  const unreadReport = generateReport('CONTAGEM NÃO LIDAS', unreadResults, Date.now())
  
  // Relatório final
  const totalDuration = Date.now() - startTime
  console.log(`\n🎯 RESUMO FINAL DO TESTE DE CHAT`)
  console.log(`⏱️  Duração total: ${totalDuration}ms`)
  console.log(`🏠 Sala: ${joinReport.successRate.toFixed(1)}% entraram (${joinReport.requestsPerSecond.toFixed(1)} req/s)`)
  console.log(`💬 Mensagens: ${messageReport.successRate.toFixed(1)}% enviadas (${messageReport.requestsPerSecond.toFixed(1)} req/s)`)
  console.log(`📖 Busca: ${fetchReport.successRate.toFixed(1)}% sucesso (${fetchReport.requestsPerSecond.toFixed(1)} req/s)`)
  console.log(`🔢 Contadores: ${unreadReport.successRate.toFixed(1)}% sucesso (${unreadReport.requestsPerSecond.toFixed(1)} req/s)`)
  
  // Salvar dados da sala para próximos testes
  fs.writeFileSync(
    path.join(__dirname, '../data/test-room.json'),
    JSON.stringify({ roomId, roomName: roomData.name, joinedUsers: joinedUsers.length }, null, 2)
  )
  
  return {
    joinReport,
    messageReport,
    fetchReport,
    unreadReport,
    totalDuration
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testChatMessages()
    .then(() => {
      console.log('\n✅ Teste de chat concluído!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Erro no teste de chat:', error)
      process.exit(1)
    })
}

module.exports = { testChatMessages }
