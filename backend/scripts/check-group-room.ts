import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkGroupRoom() {
  console.log('🔍 Verificando grupo...')
  
  const roomId = 'ea8951ae-35e6-40fd-922b-7eeb89c5c116'
  
  // Verificar a sala
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      users: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
    },
  })

  console.log('📋 Sala:', {
    id: room?.id,
    name: room?.name,
    isDirect: room?.isDirect,
    userCount: room?.users.length,
  })

  if (room?.users) {
    console.log('👥 Usuários na sala:')
    room.users.forEach((roomUser, index) => {
      console.log(`  ${index + 1}. ${roomUser.user.username} (${roomUser.user.id}) - Role: ${roomUser.role}`)
    })
  }

  // Verificar se o usuário específico está na sala
  const userId = '74d5b27f-de35-4497-a73d-de5d80a3e17f' // arthurb.dev

  const userInRoom = await prisma.roomUser.findUnique({
    where: {
      userId_roomId: {
        userId: userId,
        roomId: roomId,
      },
    },
  })

  console.log('\n🔍 Verificação específica:')
  console.log(`arthurb.dev (${userId}) na sala: ${userInRoom ? 'SIM' : 'NÃO'}`)

  if (!userInRoom) {
    console.log('\n⚠️  Problema detectado: usuário não está na sala!')
    
    console.log('➕ Adicionando arthurb.dev à sala...')
    await prisma.roomUser.create({
      data: {
        userId: userId,
        roomId: roomId,
        role: 'OWNER',
      },
    })
    
    console.log('✅ Usuário adicionado à sala!')
  }
}

checkGroupRoom()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
