import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { ChatWindow } from '../../../components/chat/chat-window'
import { useChat } from '../../../contexts/chat.context'
import { Button } from '../../../components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export function DirectMessage() {
  const { friendId } = useParams<{ friendId: string }>()
  const navigate = useNavigate()
  const { getOrCreateDM, joinRoom, leaveRoom } = useChat()
  const [roomId, setRoomId] = useState<string | null>(() => {
    const stored = localStorage.getItem(`dm_room_${friendId}`)
    return stored || null
  })
  const [isLoading, setIsLoading] = useState(true)

  const initializeDM = useCallback(async () => {
    if (!friendId || roomId) return

    try {
      setIsLoading(true)
      console.log('🔍 Criando/buscando DM para friend:', friendId)
      
      const dmRoomId = await getOrCreateDM(friendId)
      console.log('✅ DM Room ID obtido:', dmRoomId)
      setRoomId(dmRoomId)
      localStorage.setItem(`dm_room_${friendId}`, dmRoomId)
      
      console.log('🔄 Tentando entrar na sala:', dmRoomId)
      await joinRoom(dmRoomId)
      console.log('✅ Entrou na sala com sucesso')
    } catch (error) {
      console.error('❌ Erro ao inicializar DM:', error)
      toast.error('Erro ao abrir conversa')
      navigate('/')
    } finally {
      setIsLoading(false)
    }
  }, [friendId, roomId, getOrCreateDM, joinRoom, navigate])

  useEffect(() => {
    console.log('🔄 useEffect triggered - friendId:', friendId, 'roomId:', roomId)
    if (friendId && !roomId) {
      console.log('🚀 Inicializando DM...')
      initializeDM()
    } else if (friendId && roomId) {
      console.log('✅ RoomId já existe, tentando entrar na sala:', roomId)
      // Se o roomId já existe, tentar entrar na sala diretamente
      joinRoom(roomId).catch(error => {
        console.error('❌ Erro ao entrar na sala existente:', error)
        // Se falhar, limpar o roomId e tentar novamente
        setRoomId(null)
        localStorage.removeItem(`dm_room_${friendId}`)
      })
    }
  }, [friendId, roomId, initializeDM, joinRoom])



  useEffect(() => {
    return () => {
      if (roomId) {
        leaveRoom(roomId)
        localStorage.removeItem(`dm_room_${friendId}`)
      }
    }
  }, [roomId, leaveRoom, friendId])

  if (!friendId) {
    return (
      <>
        <Helmet title="Chat - Erro" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium">Amigo não encontrado</h3>
            <Button onClick={() => navigate('/')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <Helmet title="Chat - Carregando" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium">Carregando conversa...</h3>
            <p className="text-muted-foreground">Preparando chat direto</p>
          </div>
        </div>
      </>
    )
  }

  if (!roomId) {
    return (
      <>
        <Helmet title="Chat - Erro" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium">Erro ao carregar conversa</h3>
            <Button onClick={() => navigate('/')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet title="Chat - Mensagem Direta" />
      <div className="h-full flex flex-col">
        <ChatWindow roomId={roomId} />
      </div>
    </>
  )
}
