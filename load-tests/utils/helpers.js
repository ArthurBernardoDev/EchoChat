const axios = require('axios')
const { faker } = require('@faker-js/faker')
const { BASE_URL, TIMEOUTS } = require('./config')

// Configurar axios com timeout
const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUTS.REQUEST,
  withCredentials: true
})

// Helper para gerar dados fake
const generateUser = () => ({
  username: faker.internet.userName().toLowerCase(),
  email: faker.internet.email().toLowerCase(),
  password: 'Test123!@#'
})

const generateRoom = () => ({
  name: faker.company.name(),
  description: faker.lorem.sentence(),
  isPrivate: Math.random() > 0.7 // 30% chance de ser privado
})

// Helper para delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Helper para registrar usuário
const registerUser = async (userData = null) => {
  const user = userData || generateUser()
  try {
    const response = await api.post('/auth/register', user)
    return { success: true, user, token: response.data.access_token, data: response.data }
  } catch (error) {
    return { 
      success: false, 
      user, 
      error: error.response?.data?.message || error.message 
    }
  }
}

// Helper para fazer login
const loginUser = async (credentials) => {
  try {
    const response = await api.post('/auth/login', {
      username: credentials.username,
      password: credentials.password
    })
    return { success: true, token: response.data.access_token, data: response.data }
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    }
  }
}

// Helper para fazer requisição autenticada
const authenticatedRequest = async (token, method, url, data = null) => {
  try {
    const config = {
      method,
      url,
      headers: { Authorization: `Bearer ${token}` }
    }
    if (data) config.data = data
    
    const response = await api(config)
    return { success: true, data: response.data }
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    }
  }
}

// Helper para medir tempo de resposta
const measureTime = async (fn) => {
  const start = Date.now()
  const result = await fn()
  const duration = Date.now() - start
  return { ...result, duration }
}

// Helper para executar testes em paralelo
const runConcurrent = async (tasks, concurrency = 5) => {
  const results = []
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(batch.map(task => task()))
    results.push(...batchResults.map((result, index) => ({
      index: i + index,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    })))
  }
  return results
}

// Helper para gerar relatório
const generateReport = (testName, results, startTime) => {
  const endTime = Date.now()
  const totalDuration = endTime - startTime
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const totalRequests = results.length
  
  const durations = results
    .filter(r => r.data?.duration)
    .map(r => r.data.duration)
  
  const avgDuration = durations.length > 0 
    ? durations.reduce((a, b) => a + b, 0) / durations.length 
    : 0
  
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0
  const minDuration = durations.length > 0 ? Math.min(...durations) : 0
  
  console.log(`\n📊 RELATÓRIO: ${testName}`)
  console.log(`⏱️  Duração total: ${totalDuration}ms`)
  console.log(`📈 Total de requisições: ${totalRequests}`)
  console.log(`✅ Sucessos: ${successful} (${(successful/totalRequests*100).toFixed(1)}%)`)
  console.log(`❌ Falhas: ${failed} (${(failed/totalRequests*100).toFixed(1)}%)`)
  console.log(`⚡ Req/s: ${totalDuration > 0 ? (totalRequests / (totalDuration / 1000)).toFixed(2) : 'N/A'}`)
  console.log(`🎯 Tempo médio: ${avgDuration.toFixed(0)}ms`)
  console.log(`🔥 Tempo máximo: ${maxDuration}ms`)
  console.log(`🚀 Tempo mínimo: ${minDuration}ms`)
  
  if (failed > 0) {
    console.log(`\n❌ ERROS ENCONTRADOS:`)
    const errorCounts = {}
    results.filter(r => !r.success).forEach(r => {
      const error = r.error?.message || r.data?.error || 'Erro desconhecido'
      errorCounts[error] = (errorCounts[error] || 0) + 1
    })
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`   ${count}x: ${error}`)
    })
  }
  
  return {
    testName,
    totalDuration,
    totalRequests,
    successful,
    failed,
    successRate: successful/totalRequests*100,
    requestsPerSecond: totalRequests / (totalDuration / 1000),
    avgDuration,
    maxDuration,
    minDuration,
    errors: results.filter(r => !r.success).map(r => r.error || r.data?.error)
  }
}

module.exports = {
  api,
  generateUser,
  generateRoom,
  sleep,
  registerUser,
  loginUser,
  authenticatedRequest,
  measureTime,
  runConcurrent,
  generateReport
}
