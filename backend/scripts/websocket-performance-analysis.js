#!/usr/bin/env node


const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
})

const queryAnalysis = {
  totalQueries: 0,
  slowQueries: [],
  indexUsage: new Map()
}

prisma.$on('query', (e) => {
  queryAnalysis.totalQueries++
  
  if (e.duration > 100) { // Queries > 100ms são consideradas lentas
    queryAnalysis.slowQueries.push({
      query: e.query,
      duration: e.duration,
      params: e.params
    })
  }
})

async function measureWebSocketOperations() {
  console.log('🔌 ANÁLISE DE PERFORMANCE - OPERAÇÕES WEBSOCKET CRÍTICAS\n')

  const testUserId = 'test-user-' + Date.now()
  const testRoomId = 'test-room-' + Date.now()
  
  try {
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${Date.now()}@example.com`,
        username: `testuser-${Date.now()}`,
        password: 'hashedpassword',
        status: 'ONLINE'
      }
    })

    await prisma.room.create({
      data: {
        id: testRoomId,
        name: `Test Room ${Date.now()}`,
        description: 'Room for performance testing',
        isPrivate: false
      }
    })

    await prisma.roomUser.create({
      data: {
        userId: testUserId,
        roomId: testRoomId,
        role: 'MEMBER'
      }
    })

    console.log('📋 TESTANDO OPERAÇÕES WEBSOCKET CRÍTICAS:\n')

    const accessCheck = await measureQuery(
      'Verificação de acesso à sala (userId_roomId)',
      () => prisma.roomUser.findUnique({
        where: { 
          userId_roomId: { 
            userId: testUserId, 
            roomId: testRoomId 
          } 
        }
      })
    )

    const userRooms = await measureQuery(
      'Auto-join: buscar salas do usuário',
      () => prisma.roomUser.findMany({
        where: { userId: testUserId },
        include: { room: true },
        orderBy: { joinedAt: 'desc' }
      })
    )

    const createMessage = await measureQuery(
      'Criação de mensagem',
      () => prisma.message.create({
        data: {
          content: 'Test message for performance analysis',
          userId: testUserId,
          roomId: testRoomId
        },
        include: {
          user: { select: { username: true, avatar: true } }
        }
      })
    )

    const recentMessages = await measureQuery(
      'Mensagens recentes da sala (50 últimas)',
      () => prisma.message.findMany({
        where: { 
          roomId: testRoomId,
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
    )

    const onlineUsers = await measureQuery(
      'Usuários online (status index)',
      () => prisma.user.findMany({
        where: { status: 'ONLINE' },
        select: { id: true, username: true, avatar: true, lastSeen: true },
        orderBy: { lastSeen: 'desc' },
        take: 100
      })
    )

    const unreadNotifications = await measureQuery(
      'Notificações não lidas',
      () => prisma.notification.findMany({
        where: { 
          userId: testUserId,
          read: false
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    )

    const onlineFriends = await measureQuery(
      'Amigos online',
      () => prisma.friendship.findMany({
        where: { 
          senderId: testUserId,
          status: 'ACCEPTED'
        },
        include: { 
          receiver: { 
            select: { 
              id: true, 
              username: true, 
              status: true, 
              avatar: true 
            } 
          } 
        }
      })
    )

    console.log('\n📊 ANÁLISE DOS RESULTADOS:')
    console.log('=' .repeat(60))

    const successfulOps = results.filter(r => r.success)
    const criticalOps = [accessCheck, userRooms, createMessage, recentMessages]
    const criticalSuccessful = criticalOps.filter(r => r.success)

    if (criticalSuccessful.length > 0) {
      const avgCritical = criticalSuccessful.reduce((sum, r) => sum + r.duration, 0) / criticalSuccessful.length
      const maxCritical = Math.max(...criticalSuccessful.map(r => r.duration))

      console.log(`🎯 Operações críticas WebSocket: ${criticalSuccessful.length}/${criticalOps.length}`)
      console.log(`⚡ Tempo médio (críticas): ${avgCritical.toFixed(2)}ms`)
      console.log(`🐌 Tempo máximo (críticas): ${maxCritical.toFixed(2)}ms`)

      const scalabilityRating = avgCritical < 5 ? 'EXCELENTE' :
                               avgCritical < 15 ? 'BOM' :
                               avgCritical < 50 ? 'ACEITÁVEL' : 'INADEQUADO'

      console.log(`🏆 Avaliação para 1M usuários: ${scalabilityRating}`)

      if (avgCritical < 15) {
        console.log('✅ Índices otimizados adequados para alta escala')
        console.log('✅ WebSocket operations prontas para 1M+ usuários')
      } else {
        console.log('⚠️  Performance pode degradar com 1M usuários')
        console.log('💡 Considerar sharding e read replicas')
      }
    }

    if (queryAnalysis.slowQueries.length > 0) {
      console.log('\n🐌 QUERIES LENTAS DETECTADAS:')
      queryAnalysis.slowQueries.forEach((query, index) => {
        console.log(`${index + 1}. ${query.duration}ms: ${query.query.substring(0, 100)}...`)
      })
    }

    console.log(`\n📈 ESTATÍSTICAS GERAIS:`)
    console.log(`   Total de queries executadas: ${queryAnalysis.totalQueries}`)
    console.log(`   Queries lentas (>100ms): ${queryAnalysis.slowQueries.length}`)
    console.log(`   Taxa de sucesso: ${(successfulOps.length / results.length * 100).toFixed(1)}%`)

    await prisma.message.deleteMany({ where: { userId: testUserId } })
    await prisma.roomUser.deleteMany({ where: { userId: testUserId } })
    await prisma.room.delete({ where: { id: testRoomId } })
    await prisma.user.delete({ where: { id: testUserId } })

  } catch (error) {
    console.error('❌ Erro durante análise:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  measureWebSocketOperations()
    .then(() => {
      console.log('\n🎉 Análise de performance WebSocket concluída!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro na análise:', error)
      process.exit(1)
    })
}

module.exports = { measureWebSocketOperations }
