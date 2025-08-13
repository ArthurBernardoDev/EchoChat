import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupDuplicateDMs() {
  console.log('🔍 Procurando salas DM duplicadas...')
  
  // Buscar todas as salas DM
  const dmRooms = await prisma.room.findMany({
    where: { isDirect: true },
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
      messages: {
        select: {
          id: true,
        },
      },
    },
  })

  console.log(`📊 Encontradas ${dmRooms.length} salas DM`)

  // Agrupar por nome para encontrar duplicatas
  const groupedRooms = new Map<string, typeof dmRooms>()
  
  for (const room of dmRooms) {
    if (!groupedRooms.has(room.name)) {
      groupedRooms.set(room.name, [])
    }
    groupedRooms.get(room.name)!.push(room)
  }

  // Encontrar duplicatas
  const duplicates = Array.from(groupedRooms.entries())
    .filter(([name, rooms]) => rooms.length > 1)
    .map(([name, rooms]) => ({ name, rooms }))

  console.log(`🚨 Encontradas ${duplicates.length} salas DM duplicadas`)

  for (const { name, rooms } of duplicates) {
    console.log(`\n📝 Processando duplicatas para: ${name}`)
    
    // Ordenar por número de mensagens (mais mensagens primeiro)
    const sortedRooms = rooms.sort((a, b) => 
      b.messages.length - a.messages.length
    )

    // Manter a primeira sala (com mais mensagens) e deletar as outras
    const [keepRoom, ...deleteRooms] = sortedRooms

    console.log(`✅ Mantendo sala: ${keepRoom.id} (${keepRoom.messages.length} mensagens)`)
    
    for (const deleteRoom of deleteRooms) {
      console.log(`🗑️  Deletando sala: ${deleteRoom.id} (${deleteRoom.messages.length} mensagens)`)
      
      // Deletar mensagens primeiro
      await prisma.message.deleteMany({
        where: { roomId: deleteRoom.id }
      })
      
      // Deletar usuários da sala
      await prisma.roomUser.deleteMany({
        where: { roomId: deleteRoom.id }
      })
      
      // Deletar a sala
      await prisma.room.delete({
        where: { id: deleteRoom.id }
      })
    }
  }

  console.log('\n✅ Limpeza concluída!')
}

cleanupDuplicateDMs()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
