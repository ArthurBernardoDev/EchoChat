import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ChatWindow } from '../../../components/chat/chat-window'
import { useChat } from '../../../contexts/chat.context'
import { useAuth } from '../../../contexts/auth.context'
import { Button } from '../../../components/ui/button'
import { ArrowLeft, Settings, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { roomsService, RoomMember } from '../../../services/rooms.service'

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { joinRoom, leaveRoom, rooms } = useChat()
  const [showSettings, setShowSettings] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteInput, setInviteInput] = useState('')
  const [members, setMembers] = useState<RoomMember[]>([])
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    if (roomId) {
      // Verificar se a sala existe antes de tentar entrar
      roomsService.getRoom(roomId)
        .then(() => {
          joinRoom(roomId)
        })
        .catch((error) => {
          console.error('Erro ao acessar sala:', error)
          toast.error('Sala não encontrada ou sem acesso')
          navigate('/')
        })
      
      return () => {
        // Para grupos, não enviar leave_room automaticamente quando navegar
        // O usuário deve permanecer no grupo mesmo quando navega
        // leaveRoom(roomId)
      }
    }
  }, [roomId, joinRoom, leaveRoom, navigate])

  useEffect(() => {
    if (showSettings && roomId && isOwner) {
      roomsService.listMembers(roomId).then(setMembers).catch((e) => {
        console.error(e)
        toast.error('Não foi possível carregar membros')
      })
    }
  }, [showSettings, roomId, isOwner])


  useEffect(() => {
    if (!roomId) return
    roomsService
      .getRoom(roomId)
      .then((room) => setIsOwner(room.userRole === 'OWNER'))
      .catch(() => setIsOwner(false))
  }, [roomId])

  if (!roomId) {
    return (
      <>
        <Helmet title="Chat - Erro" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium">Room não encontrado</h3>
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
      <Helmet title="Chat - Grupo" />
      <div className="h-full flex flex-col">

        <div className="border-b p-3 flex items-center gap-2 flex-wrap">
          {isOwner && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setIsInviting(true)} className="flex-shrink-0">
                <UserPlus className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Convidar</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings((v) => !v)} className="flex-shrink-0">
                <Settings className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>


        {isOwner && isInviting && (
          <div className="border-b p-3 flex items-center gap-2 flex-wrap">
            <input
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="Username do usuário"
              className="flex-1 min-w-0 border rounded px-3 py-2 bg-background"
            />
            <Button
              size="sm"
              onClick={async () => {
                if (!roomId || !inviteInput.trim()) return
                try {
                  await roomsService.inviteUser(roomId, inviteInput.trim())
                  setInviteInput('')
                  setIsInviting(false)
                  toast.success('Convite enviado')
                } catch (e: any) {
                  console.error('Erro ao convidar:', e)
                  const errorMessage = e.response?.data?.message || 'Erro ao enviar convite'
                  toast.error(errorMessage)
                }
              }}
              className="flex-shrink-0"
            >
              <span className="hidden sm:inline">Enviar convite</span>
              <span className="sm:hidden">Enviar</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsInviting(false)} className="flex-shrink-0">
              Cancelar
            </Button>
          </div>
        )}


        <ChatWindow roomId={roomId} />


        {isOwner && showSettings && (
          <div className="border-t p-4 bg-muted">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Configurações do grupo</span>
              <Button size="sm" variant="ghost" onClick={() => setShowSettings(false)}>Fechar</Button>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Membros</h3>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.user.id} className="flex items-center justify-between p-2 bg-background rounded border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        {m.user.avatar ? (
                          <img src={m.user.avatar} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          m.user.username[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{m.user.username}</div>
                        <div className="text-xs text-muted-foreground">Role: {m.role}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.user.id !== user?.id && m.role !== 'OWNER' && (
                        <>
                          <Button size="sm" variant="outline" onClick={async () => {
                            if (!roomId) return
                            try {
                              const newRole = m.role === 'MEMBER' ? 'MODERATOR' : m.role === 'MODERATOR' ? 'ADMIN' : 'MEMBER'
                              await roomsService.updateMemberRole(roomId, m.user.id, newRole)
                              const updated = await roomsService.listMembers(roomId)
                              setMembers(updated)
                              toast.success('Role atualizado')
                            } catch (e: any) {
                              const errorMessage = e.response?.data?.message || 'Erro ao alterar role'
                              toast.error(errorMessage)
                            }
                          }}>Promover</Button>
                          <Button size="sm" variant="secondary" onClick={async () => {
                            if (!roomId) return
                            try {
                              await roomsService.mute(roomId, m.user.id, 10)
                              toast.success('Usuário silenciado')
                            } catch (e: any) {
                              const errorMessage = e.response?.data?.message || 'Erro ao silenciar usuário'
                              toast.error(errorMessage)
                            }
                          }}>Silenciar 10m</Button>
                          <Button size="sm" variant="destructive" onClick={async () => {
                            if (!roomId) return
                            try {
                              await roomsService.ban(roomId, m.user.id)
                              const updated = await roomsService.listMembers(roomId)
                              setMembers(updated)
                              toast.success('Usuário banido')
                            } catch (e: any) {
                              const errorMessage = e.response?.data?.message || 'Erro ao banir usuário'
                              toast.error(errorMessage)
                            }
                          }}>Banir</Button>
                        </>
                      )}

                      {m.user.id === user?.id && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          Você
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>


            <div className="mt-6 text-sm text-muted-foreground">
              Em breve: editar nome/descrição e avatar do grupo.
            </div>
          </div>
        )}
      </div>
    </>
  )
}
