#!/usr/bin/env node


const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function measureQuery(name, queryFn) {
  const start = process.hrtime.bigint()
  try {
    const result = await queryFn()
    const end = process.hrtime.bigint()
    const duration = Number(end - start) / 1000000 // Convert to milliseconds
    
    console.log(`✅ ${name}: ${duration.toFixed(2)}ms`)
    return { success: true, duration, resultCount: Array.isArray(result) ? result.length : 1 }
  } catch (error) {
    const end = process.hrtime.bigint()
    const duration = Number(end - start) / 1000000
    console.log(`❌ ${name}: ${duration.toFixed(2)}ms - ERROR: ${error.message}`)
    return { success: false, duration, error: error.message }
  }
}

async function analyzeIndexPerformance() {
  console.log('🔍 ANÁLISE DE PERFORMANCE DOS ÍNDICES OTIMIZADOS\n')

  const results = []

  console.log('1️⃣ QUERIES DE AUTENTICAÇÃO:')
  
  results.push(await measureQuery(
    'Login por email',
    () => prisma.user.findUnique({
      where: { email: 'test@example.com' },
      select: { id: true, username: true, password: true, emailVerified: true }
    })
  ))

  results.push(await measureQuery(
    'Busca usuário por username',
    () => prisma.user.findUnique({
      where: { username: 'testuser' },
      select: { id: true, email: true, status: true }
    })
  ))

  console.log('\n2️⃣ QUERIES DE MEMBERSHIP:')
  
  results.push(await measureQuery(
    'Salas do usuário (ordenadas)',
    () => prisma.roomUser.findMany({
      where: { userId: 'test-user-id' },
      include: { room: true },
      orderBy: { joinedAt: 'desc' },
      take: 50
    })
  ))

  results.push(await measureQuery(
    'Verificação de acesso à sala',
    () => prisma.roomUser.findUnique({
      where: { 
        userId_roomId: { 
          userId: 'test-user-id', 
          roomId: 'test-room-id' 
        } 
      }
    })
  ))

  results.push(await measureQuery(
    'Membros da sala por role',
    () => prisma.roomUser.findMany({
      where: { 
        roomId: 'test-room-id',
        role: 'ADMIN'
      },
      include: { user: { select: { username: true, status: true } } }
    })
  ))

  console.log('\n3️⃣ QUERIES DE MENSAGENS:')
  
  results.push(await measureQuery(
    'Mensagens recentes da sala',
    () => prisma.message.findMany({
      where: { 
        roomId: 'test-room-id',
        deleted: false
      },
      include: { 
        user: { select: { username: true, avatar: true } },
        reactions: true,
        readReceipts: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
  ))

  results.push(await measureQuery(
    'Histórico de mensagens do usuário',
    () => prisma.message.findMany({
      where: { userId: 'test-user-id' },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
  ))

  results.push(await measureQuery(
    'Mensagens do usuário na sala específica',
    () => prisma.message.findMany({
      where: { 
        roomId: 'test-room-id',
        userId: 'test-user-id',
        deleted: false
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
  ))

  console.log('\n4️⃣ QUERIES DE NOTIFICAÇÕES:')
  
  results.push(await measureQuery(
    'Notificações não lidas',
    () => prisma.notification.findMany({
      where: { 
        userId: 'test-user-id',
        read: false
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
  ))

  results.push(await measureQuery(
    'Feed de notificações',
    () => prisma.notification.findMany({
      where: { userId: 'test-user-id' },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
  ))

  console.log('\n5️⃣ QUERIES DE AMIZADES:')
  
  results.push(await measureQuery(
    'Amigos ativos do usuário',
    () => prisma.friendship.findMany({
      where: { 
        senderId: 'test-user-id',
        status: 'ACCEPTED'
      },
      include: { receiver: { select: { username: true, status: true } } }
    })
  ))

  results.push(await measureQuery(
    'Solicitações de amizade pendentes',
    () => prisma.friendship.findMany({
      where: { 
        receiverId: 'test-user-id',
        status: 'PENDING'
      },
      include: { sender: { select: { username: true, avatar: true } } },
      orderBy: { createdAt: 'desc' }
    })
  ))

  console.log('\n6️⃣ QUERIES DE BUSCA:')
  
  results.push(await measureQuery(
    'Usuários online',
    () => prisma.user.findMany({
      where: { status: 'ONLINE' },
      select: { id: true, username: true, avatar: true, lastSeen: true },
      orderBy: { lastSeen: 'desc' },
      take: 100
    })
  ))

  results.push(await measureQuery(
    'Salas públicas recentes',
    () => prisma.room.findMany({
      where: { isPrivate: false },
      include: { 
        _count: { select: { users: true, messages: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
  ))

  console.log('\n📊 RELATÓRIO DE PERFORMANCE DOS ÍNDICES:')
  console.log('=' .repeat(60))
  
  const successfulQueries = results.filter(r => r.success)
  const failedQueries = results.filter(r => !r.success)
  
  if (successfulQueries.length > 0) {
    const avgDuration = successfulQueries.reduce((sum, r) => sum + r.duration, 0) / successfulQueries.length
    const maxDuration = Math.max(...successfulQueries.map(r => r.duration))
    const minDuration = Math.min(...successfulQueries.map(r => r.duration))
    
    console.log(`✅ Queries bem-sucedidas: ${successfulQueries.length}/${results.length}`)
    console.log(`⚡ Tempo médio: ${avgDuration.toFixed(2)}ms`)
    console.log(`🚀 Tempo mínimo: ${minDuration.toFixed(2)}ms`)
    console.log(`🐌 Tempo máximo: ${maxDuration.toFixed(2)}ms`)
    
    const performance = avgDuration < 10 ? 'EXCELENTE' : 
                       avgDuration < 50 ? 'BOM' : 
                       avgDuration < 100 ? 'ACEITÁVEL' : 'RUIM'
    
    console.log(`🏆 Performance geral: ${performance}`)
    
    const slowQueries = successfulQueries
      .filter(r => r.duration > avgDuration * 1.5)
      .sort((a, b) => b.duration - a.duration)
    
    if (slowQueries.length > 0) {
      console.log('\n⚠️  QUERIES MAIS LENTAS (candidatas para otimização):')
      slowQueries.slice(0, 3).forEach((query, index) => {
        console.log(`   ${index + 1}. ${query.duration.toFixed(2)}ms`)
      })
    }
  }
  
  if (failedQueries.length > 0) {
    console.log(`\n❌ Queries com erro: ${failedQueries.length}`)
    failedQueries.forEach(query => {
      console.log(`   - ${query.error}`)
    })
  }

  console.log('\n🎯 RECOMENDAÇÕES PARA 1 MILHÃO DE USUÁRIOS:')
  console.log('=' .repeat(60))
  
  if (avgDuration < 10) {
    console.log('✅ Índices estão otimizados para alta escala')
    console.log('✅ Performance adequada para 1M+ usuários')
  } else if (avgDuration < 50) {
    console.log('⚠️  Performance boa, mas monitorar em produção')
    console.log('💡 Considerar particionamento para tabelas grandes')
  } else {
    console.log('❌ Performance insuficiente para 1M usuários')
    console.log('🔧 Necessário: sharding + read replicas + cache')
  }

  console.log('\n📋 PRÓXIMOS PASSOS RECOMENDADOS:')
  console.log('1. 🗂️  Implementar particionamento da tabela messages')
  console.log('2. 🔄 Configurar read replicas para queries de leitura')
  console.log('3. 💾 Implementar cache Redis para dados frequentes')
  console.log('4. 📊 Monitorar uso de índices em produção')
  console.log('5. 🧹 Implementar cleanup automático de dados antigos')

  await prisma.$disconnect()
}

if (require.main === module) {
  analyzeIndexPerformance()
    .then(() => {
      console.log('\n🎉 Análise de índices concluída!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro na análise:', error)
      process.exit(1)
    })
}

module.exports = { analyzeIndexPerformance }
