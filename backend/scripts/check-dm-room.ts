import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDMRoom() {
  console.log('🔍 Verificando sala DM...')
  
  const roomId = '8bbb786a-4248-40c7-91d8-c4b3c073f7ba'
  
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

  // Verificar se os usuários específicos estão na sala
  const userId1 = '74d5b27f-de35-4497-a73d-de5d80a3e17f' // arthurb.dev
  const userId2 = 'abd25cff-d231-4aec-b690-81f449ed0487' // jo1

  const user1InRoom = await prisma.roomUser.findUnique({
    where: {
      userId_roomId: {
        userId: userId1,
        roomId: roomId,
      },
    },
  })

  const user2InRoom = await prisma.roomUser.findUnique({
    where: {
      userId_roomId: {
        userId: userId2,
        roomId: roomId,
      },
    },
  })

  console.log('\n🔍 Verificação específica:')
  console.log(`arthurb.dev (${userId1}) na sala: ${user1InRoom ? 'SIM' : 'NÃO'}`)
  console.log(`jo1 (${userId2}) na sala: ${user2InRoom ? 'SIM' : 'NÃO'}`)

  if (!user1InRoom || !user2InRoom) {
    console.log('\n⚠️  Problema detectado: usuários não estão na sala!')
    
    if (!user1InRoom) {
      console.log('➕ Adicionando arthurb.dev à sala...')
      await prisma.roomUser.create({
        data: {
          userId: userId1,
          roomId: roomId,
          role: 'MEMBER',
        },
      })
    }
    
    if (!user2InRoom) {
      console.log('➕ Adicionando jo1 à sala...')
      await prisma.roomUser.create({
        data: {
          userId: userId2,
          roomId: roomId,
          role: 'MEMBER',
        },
      })
    }
    
    console.log('✅ Usuários adicionados à sala!')
  }
}

checkDMRoom()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
