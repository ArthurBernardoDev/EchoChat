#!/usr/bin/env node

const { 
  authenticatedRequest, 
  runConcurrent, 
  generateReport,
  sleep 
} = require('../utils/helpers')
const { TEST_CONFIG } = require('../utils/config')
const fs = require('fs')
const path = require('path')

async function testFriendsSystem() {
  console.log('👥 INICIANDO TESTE DO SISTEMA DE AMIGOS')
  
  // Carregar usuários do teste anterior
  const usersFile = path.join(__dirname, '../data/test-users.json')
  if (!fs.existsSync(usersFile)) {
    console.error('❌ Execute primeiro o teste básico: npm run test:basic')
    process.exit(1)
  }
  
  const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'))
  const testUsers = users.slice(0, TEST_CONFIG.FRIENDS_USERS)
  
  console.log(`📊 Configuração:`)
  console.log(`   - Usuários: ${testUsers.length}`)
  console.log(`   - Solicitações por usuário: ${TEST_CONFIG.FRIENDS_REQUESTS_PER_USER}`)
  
  const startTime = Date.now()
  
  console.log(`\n1️⃣ FASE 1: BUSCA DE USUÁRIOS`)
  
  // Cada usuário busca outros usuários
  const searchTasks = testUsers.map(user => () => 
    authenticatedRequest(user.token, 'GET', '/friends/search?q=test')
  )
  const searchResults = await runConcurrent(searchTasks, 5)
  
  const searchReport = generateReport('BUSCA DE USUÁRIOS', searchResults, Date.now())
  
  console.log(`\n2️⃣ FASE 2: ENVIO DE SOLICITAÇÕES DE AMIZADE`)
  
  // Criar pares de usuários para solicitações
  const friendRequestTasks = []
  for (let i = 0; i < testUsers.length; i++) {
    for (let j = 0; j < Math.min(TEST_CONFIG.FRIENDS_REQUESTS_PER_USER, testUsers.length - 1); j++) {
      const targetIndex = (i + j + 1) % testUsers.length
      if (targetIndex !== i) {
        friendRequestTasks.push(() => 
          authenticatedRequest(
            testUsers[i].token, 
            'POST', 
            '/friends/request', 
            { username: testUsers[targetIndex].username }
          )
        )
      }
    }
  }
  
  const requestResults = await runConcurrent(friendRequestTasks, 8)
  const requestReport = generateReport('SOLICITAÇÕES DE AMIZADE', requestResults, Date.now())
  
  await sleep(1000)
  
  console.log(`\n3️⃣ FASE 3: BUSCA DE SOLICITAÇÕES RECEBIDAS`)
  
  // Cada usuário busca suas solicitações
  const pendingTasks = testUsers.map(user => () => 
    authenticatedRequest(user.token, 'GET', '/friends/requests')
  )
  const pendingResults = await runConcurrent(pendingTasks, 5)
  
  const pendingReport = generateReport('BUSCA DE SOLICITAÇÕES', pendingResults, Date.now())
  
  console.log(`\n4️⃣ FASE 4: RESPOSTA ÀS SOLICITAÇÕES`)
  
  // Aceitar algumas solicitações (50%) e rejeitar outras
  const responseTasks = []
  pendingResults.forEach((result, userIndex) => {
    if (result.success && result.data?.data) {
      const requests = result.data.data
      requests.forEach((request, reqIndex) => {
        const response = reqIndex % 2 === 0 ? 'ACCEPTED' : 'DECLINED'
        responseTasks.push(() => 
          authenticatedRequest(
            testUsers[userIndex].token, 
            'POST', 
            `/friends/respond/${request.id}`, 
            { response }
          )
        )
      })
    }
  })
  
  const responseResults = await runConcurrent(responseTasks, 8)
  const responseReport = generateReport('RESPOSTA ÀS SOLICITAÇÕES', responseResults, Date.now())
  
  console.log(`\n5️⃣ FASE 5: BUSCA DE AMIGOS`)
  
  // Cada usuário busca sua lista de amigos
  const friendsTasks = testUsers.map(user => () => 
    authenticatedRequest(user.token, 'GET', '/friends')
  )
  const friendsResults = await runConcurrent(friendsTasks, 5)
  
  const friendsReport = generateReport('BUSCA DE AMIGOS', friendsResults, Date.now())
  
  // Relatório final
  const totalDuration = Date.now() - startTime
  console.log(`\n🎯 RESUMO FINAL DO TESTE DE AMIGOS`)
  console.log(`⏱️  Duração total: ${totalDuration}ms`)
  console.log(`🔍 Busca: ${searchReport.successRate.toFixed(1)}% sucesso (${searchReport.requestsPerSecond.toFixed(1)} req/s)`)
  console.log(`📤 Solicitações: ${requestReport.successRate.toFixed(1)}% enviadas (${requestReport.requestsPerSecond.toFixed(1)} req/s)`)
  console.log(`📥 Pendentes: ${pendingReport.successRate.toFixed(1)}% buscadas (${pendingReport.requestsPerSecond.toFixed(1)} req/s)`)
  console.log(`✅ Respostas: ${responseReport.successRate.toFixed(1)}% processadas (${responseReport.requestsPerSecond.toFixed(1)} req/s)`)
  console.log(`👥 Amigos: ${friendsReport.successRate.toFixed(1)}% listados (${friendsReport.requestsPerSecond.toFixed(1)} req/s)`)
  
  return {
    searchReport,
    requestReport,
    pendingReport,
    responseReport,
    friendsReport,
    totalDuration
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testFriendsSystem()
    .then(() => {
      console.log('\n✅ Teste do sistema de amigos concluído!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Erro no teste de amigos:', error)
      process.exit(1)
    })
}

module.exports = { testFriendsSystem }
