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
const { TEST_CONFIG, TIMEOUTS } = require('../utils/config')

async function testBasicAuth() {
  console.log('🚀 INICIANDO TESTE BÁSICO DE AUTENTICAÇÃO')
  console.log(`📊 Configuração:`)
  console.log(`   - Usuários: ${TEST_CONFIG.BASIC_USERS}`)
  console.log(`   - Concorrência: ${TEST_CONFIG.BASIC_CONCURRENT}`)
  console.log(`   - Timeout: ${TIMEOUTS.REQUEST}ms`)
  
  const startTime = Date.now()
  const users = []
  
  // Gerar usuários
  for (let i = 0; i < TEST_CONFIG.BASIC_USERS; i++) {
    users.push(generateUser())
  }
  
  console.log(`\n1️⃣ FASE 1: REGISTRO DE ${users.length} USUÁRIOS`)
  
  // Teste de registro
  const registerTasks = users.map(user => () => measureTime(() => registerUser(user)))
  const registerResults = await runConcurrent(registerTasks, TEST_CONFIG.BASIC_CONCURRENT)
  
  const registerReport = generateReport('REGISTRO DE USUÁRIOS', registerResults, startTime)
  
  // Filtrar usuários registrados com sucesso
  const registeredUsers = registerResults
    .filter(r => r.success && r.data?.success)
    .map((r, i) => ({ ...users[r.index], token: r.data.token }))
  
  console.log(`\n✅ Usuários registrados com sucesso: ${registeredUsers.length}`)
  
  // Aguardar um pouco antes dos logins
  await sleep(1000)
  
  console.log(`\n2️⃣ FASE 2: LOGIN DE ${registeredUsers.length} USUÁRIOS`)
  
  // Teste de login
  const loginTasks = registeredUsers.map(user => () => 
    measureTime(() => loginUser({ username: user.username, password: user.password }))
  )
  const loginResults = await runConcurrent(loginTasks, TEST_CONFIG.BASIC_CONCURRENT)
  
  const loginReport = generateReport('LOGIN DE USUÁRIOS', loginResults, Date.now())
  
  console.log(`\n3️⃣ FASE 3: VALIDAÇÃO DE TOKENS`)
  
  // Teste de validação de token (buscar perfil)
  const validTokens = loginResults
    .filter(r => r.success && r.data?.success)
    .map(r => r.data.data.accessToken)
  
  const { authenticatedRequest } = require('../utils/helpers')
  const profileTasks = validTokens.map(token => () => 
    measureTime(() => authenticatedRequest(token, 'GET', '/auth/profile'))
  )
  const profileResults = await runConcurrent(profileTasks, TEST_CONFIG.BASIC_CONCURRENT)
  
  const profileReport = generateReport('VALIDAÇÃO DE PERFIL', profileResults, Date.now())
  
  // Relatório final
  console.log(`\n🎯 RESUMO FINAL`)
  console.log(`📝 Registro: ${registerReport.successRate.toFixed(1)}% sucesso (${registerReport.requestsPerSecond.toFixed(1)} req/s)`)
  console.log(`🔐 Login: ${loginReport.successRate.toFixed(1)}% sucesso (${loginReport.requestsPerSecond.toFixed(1)} req/s)`)
  console.log(`👤 Perfil: ${profileReport.successRate.toFixed(1)}% sucesso (${profileReport.requestsPerSecond.toFixed(1)} req/s)`)
  console.log(`⏱️  Tempo total: ${Date.now() - startTime}ms`)
  
  // Salvar tokens válidos para outros testes
  const validUsers = []
  loginResults.forEach((result, index) => {
    if (result.success && result.data?.success) {
      const user = registeredUsers[index]
      validUsers.push({
        username: user.username,
        email: user.email,
        password: user.password,
        token: result.data.data.accessToken
      })
    }
  })
  
  require('fs').writeFileSync(
    require('path').join(__dirname, '../data/test-users.json'),
    JSON.stringify(validUsers, null, 2)
  )
  
  console.log(`💾 ${validUsers.length} usuários salvos para próximos testes`)
  
  return {
    registerReport,
    loginReport,
    profileReport,
    validUsers: validUsers.length
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  // Criar diretório data se não existir
  const fs = require('fs')
  const path = require('path')
  const dataDir = path.join(__dirname, '../data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  testBasicAuth()
    .then(() => {
      console.log('\n✅ Teste básico de autenticação concluído!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Erro no teste:', error)
      process.exit(1)
    })
}

module.exports = { testBasicAuth }
