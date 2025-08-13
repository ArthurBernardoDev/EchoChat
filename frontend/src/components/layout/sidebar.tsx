import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Users, 
  MessageSquare, 
  Settings, 
  Plus,
  Hash,
  UserCheck,
  UserPlus,
  Clock,
  Search,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { cn } from '../../lib/utils'
import { friendsService, Friend, FriendRequest } from '../../services/friends.service'
import { roomsService, Room, PublicRoom } from '../../services/rooms.service'

import { userService } from '../../services/user.service'
import { useAuth } from '../../contexts/auth.context'
import { useChat } from '../../contexts/chat.context'

export function Sidebar() {
  const { user } = useAuth()
  const { 
    activeRoomId, 
    unreadSummary, 
    onFriendRequestReceived, 
    onFriendRequestResponse, 
    onFriendRemoved,
    onStatusUpdate 
  } = useChat()
  const [activeTab, setActiveTab] = useState<'friends' | 'rooms'>('friends')
  const [searchQuery, setSearchQuery] = useState('')
  const [friends, setFriends] = useState<Friend[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([])
  const [isSearchingRooms, setIsSearchingRooms] = useState(false)
  const location = useLocation()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (activeTab === 'rooms') {
      loadData()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'rooms') {
      const id = setTimeout(() => loadData(), 250)
      return () => clearTimeout(id)
    }
  }, [location.pathname, activeTab])

  useEffect(() => {
    if (location.pathname === '/' && activeTab === 'rooms') {
      loadData()
    }
  }, [location.pathname, activeTab])

  useEffect(() => {
    if (location.pathname === '/') {
      loadData()
    }
  }, [location.pathname])

  useEffect(() => {
    if (user) {
      console.log('🔌 Configurando listeners do sidebar para usuário:', user.username)
      ;(async () => {
        try {
          await userService.updateStatus('ONLINE')
        } catch (error) {
          console.error('Erro ao atualizar status para ONLINE:', error)
        }
      })()
      
      const offFriendReq = onFriendRequestReceived((data) => {
        console.log('📨 Nova solicitação de amizade recebida:', data)
        loadData()
        toast.message(`Nova solicitação de amizade de ${data.sender.username}`)
      })
      
      const offFriendResp = onFriendRequestResponse((data) => {
        console.log('📨 Resposta de amizade recebida:', data)
        loadData()
        if (data.status === 'ACCEPTED') {
          toast.success(`${data.receiver.username} aceitou sua solicitação de amizade!`)
        }
      })

      const offFriendRemoved = onFriendRemoved((data) => {
        console.log('👥 Amigo removido:', data)
        loadData()
        toast.info('Um amigo foi removido da sua lista')
      })
      
      return () => {
        console.log('🔌 Removendo listeners do sidebar')
        offFriendReq()
        offFriendResp()
        offFriendRemoved()
      }
    }
  }, [user, onFriendRequestReceived, onFriendRequestResponse, onFriendRemoved])
    
  useEffect(() => {
    const unsubscribe = onStatusUpdate((event) => {
      console.log('📡 Atualizando status na interface:', event)
      
      setFriends(prevFriends => 
        prevFriends.map((friendship) => 
          friendship.friend.id === event.userId
            ? { ...friendship, friend: { ...friendship.friend, status: event.status } }
            : friendship
        )
      )
    })

    return unsubscribe
  }, [onStatusUpdate])

  useEffect(() => {
    if (activeTab === 'rooms' && searchQuery.length >= 2) {
      setIsSearchingRooms(true)
      const searchPublicRooms = async () => {
        try {
          const results = await roomsService.searchPublicRooms(searchQuery)
          setPublicRooms(results)
        } catch (error) {
          console.error('Erro ao buscar grupos públicos:', error)
          setPublicRooms([])
        } finally {
          setIsSearchingRooms(false)
        }
      }
      
      const timeoutId = setTimeout(searchPublicRooms, 300) // Debounce
      return () => clearTimeout(timeoutId)
    } else {
      setPublicRooms([])
      setIsSearchingRooms(false)
    }
  }, [searchQuery, activeTab])

  useEffect(() => {
    if (unreadSummary) {
      console.log('📊 Resumo de mensagens não lidas atualizado:', unreadSummary)
    }
  }, [unreadSummary])

  async function loadData() {
    try {
      console.log('🔄 Carregando dados do sidebar...')
      const [friendsData, roomsData, requestsData] = await Promise.all([
        friendsService.getFriends(),
        roomsService.getUserRooms(),
        friendsService.getFriendRequests(),
      ])

      console.log('📊 Dados carregados:', {
        friends: friendsData.length,
        rooms: roomsData.length,
        friendRequests: requestsData.length
      })

      setFriends(friendsData)
      const onlyRooms = roomsData.filter((r: any) => !r.isDirect)
      onlyRooms.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      setRooms(onlyRooms)
      setFriendRequests(requestsData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const filteredFriends = friends.filter(({ friend }) =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredRooms = rooms
    .filter((room) => !room.isDirect)
    .filter((room) => room.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="w-80 bg-gray-50 dark:bg-gray-900 border-r flex flex-col h-screen sticky top-0">

      <div className="p-4 border-b">

        {unreadSummary && unreadSummary.totalUnread > 0 && (
          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center text-sm font-medium text-blue-700 dark:text-blue-300">
              <MessageSquare className="h-4 w-4 mr-2" />
              {unreadSummary.totalUnread} mensagem{unreadSummary.totalUnread !== 1 ? 's' : ''} não lida{unreadSummary.totalUnread !== 1 ? 's' : ''}
            </div>
          </div>
        )}
        
        <div className="flex space-x-1">
          <Button
            variant={activeTab === 'friends' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('friends')}
            className="flex-1"
          >
            <Users className="h-4 w-4 mr-2" />
            Amigos
            {friendRequests.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {friendRequests.length}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'rooms' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('rooms')}
            className="flex-1"
          >
            <Hash className="h-4 w-4 mr-2" />
            Grupos
          </Button>
        </div>
      </div>


      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={`Buscar ${activeTab === 'friends' ? 'amigos' : 'grupos'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>


      <div className="flex-1 overflow-y-auto">
        {activeTab === 'friends' ? (
          <FriendsTab
            friends={filteredFriends}
            friendRequests={friendRequests}
            onDataUpdate={loadData}
            unreadSummary={unreadSummary}
          />
        ) : (
          <RoomsTab 
            rooms={filteredRooms} 
            publicRooms={publicRooms}
            isSearchingRooms={isSearchingRooms}
            searchQuery={searchQuery}
            unreadSummary={unreadSummary}
            activeRoomId={activeRoomId}
            onJoinRoom={loadData}
          />
        )}
      </div>


      <div className="p-4 border-t">
        <div className="flex space-x-2">
          {activeTab === 'friends' ? (
            <Button size="sm" className="flex-1" asChild>
              <Link to="/friends/add">
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Amigo
              </Link>
            </Button>
          ) : (
            <Button size="sm" className="flex-1" asChild>
              <Link to="/rooms/create">
                <Plus className="h-4 w-4 mr-2" />
                Criar Grupo
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/profile">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function FriendsTab({ friends, friendRequests, onDataUpdate, unreadSummary }: any) {
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)

  async function handleAcceptFriendRequest(requestId: string) {
    try {
      setProcessingRequest(requestId)
      await friendsService.acceptFriendRequest(requestId)
      toast.success('Solicitação aceita!')
      onDataUpdate()
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao aceitar solicitação'
      toast.error(message)
    } finally {
      setProcessingRequest(null)
    }
  }

  async function handleDeclineFriendRequest(requestId: string) {
    try {
      setProcessingRequest(requestId)
      await friendsService.declineFriendRequest(requestId)
      toast.success('Solicitação recusada')
      onDataUpdate()
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao recusar solicitação'
      toast.error(message)
    } finally {
      setProcessingRequest(null)
    }
  }
  return (
    <div className="p-4 space-y-4">

      <div>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
          Todos os Amigos ({friends.length})
        </h3>
        
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Solicitações Pendentes ({friendRequests.length})
          </h4>
          {friendRequests.length > 0 ? (
            <div className="space-y-2">
              {friendRequests.map((request: any) => (
                <div key={request.id} className="flex items-center justify-between p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                      {request.sender.username[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{request.sender.username}</span>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => handleAcceptFriendRequest(request.id)}
                      disabled={processingRequest === request.id}
                    >
                      <UserCheck className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDeclineFriendRequest(request.id)}
                      disabled={processingRequest === request.id}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
              Nenhuma solicitação pendente
            </p>
          )}
        </div>
        

        {friendRequests.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 mb-3"></div>
        )}
        
        <div className="space-y-1">
          {friends.map(({ friend, friendshipId }: any) => {

            const dmData = unreadSummary?.directMessages.find((dm: any) => dm.otherUser?.id === friend.id)
            const unreadCount = dmData?.unreadCount || 0
            
            return (
              <FriendItem 
                key={friendshipId} 
                friend={friend} 
                unreadCount={unreadCount}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RoomsTab({ rooms, publicRooms, isSearchingRooms, searchQuery, unreadSummary, activeRoomId, onJoinRoom }: any) {
  const handleJoinRoom = async (roomId: string) => {
    try {
      await roomsService.joinRoom(roomId)
      toast.success('Entrou no grupo com sucesso!')
      onJoinRoom() // Reload data
    } catch (error: any) {
      console.error('Erro ao entrar no grupo:', error)
      toast.error(error.response?.data?.message || 'Erro ao entrar no grupo')
    }
  }

  return (
    <div className="p-4 space-y-4">

      <div>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
          Meus Grupos ({rooms.length})
        </h3>
        <div className="space-y-1">
          {rooms
            .filter((r: any) => !r.isDirect)
            .map((room: any) => {
              const unreadCount = unreadSummary?.rooms.find((r: any) => r.roomId === room.id)?.unreadCount || 0
              return (
                <RoomItem 
                  key={room.id} 
                  room={room} 
                  unreadCount={unreadCount} 
                  isActive={activeRoomId === room.id} 
                />
              )
            })}
        </div>
      </div>


      {searchQuery.length >= 2 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center">
            <Search className="h-3 w-3 mr-1" />
            Grupos Públicos {isSearchingRooms ? '(buscando...)' : `(${publicRooms.length})`}
          </h3>
          <div className="space-y-1">
            {publicRooms.map((room: PublicRoom) => (
              <PublicRoomItem 
                key={room.id} 
                room={room} 
                onJoin={handleJoinRoom}
              />
            ))}
            {!isSearchingRooms && publicRooms.length === 0 && searchQuery.length >= 2 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                Nenhum grupo público encontrado para "{searchQuery}"
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FriendItem({ friend, unreadCount = 0 }: any) {
  const statusColors = {
    ONLINE: 'bg-green-500',
    IDLE: 'bg-yellow-500',
    DO_NOT_DISTURB: 'bg-red-500',
    OFFLINE: 'bg-gray-400',
  }

  return (
    <Link
      to={`/chat/dm/${friend.id}`}
      className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <div className="relative">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
          {friend.avatar ? (
            <img src={friend.avatar} alt={friend.username} className="w-full h-full rounded-full object-cover" />
          ) : (
            friend.username[0].toUpperCase()
          )}
        </div>
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900",
          statusColors[friend.status as keyof typeof statusColors]
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {friend.username}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {friend.status === 'ONLINE' ? 'Online' : 
           friend.status === 'IDLE' ? 'Ausente' :
           friend.status === 'DO_NOT_DISTURB' ? 'Não Perturbe' : 'Offline'}
        </p>
      </div>
      

      {unreadCount > 0 ? (
        <div className="bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 mr-2">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      ) : (
        <MessageSquare className="h-4 w-4 text-gray-400" />
      )}
    </Link>
  )
}

function RoomItem({ room, unreadCount = 0, isActive = false }: any) {
  return (
    <Link
      to={`/chat/room/${room.id}`}
      className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center text-white text-sm font-medium">
        {room.avatar ? (
          <img src={room.avatar} alt={room.name} className="w-full h-full rounded-md object-cover" />
        ) : (
          <Hash className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {room.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {room._count?.users || 0} membros
        </p>
      </div>
      <div className="ml-auto flex items-center space-x-2">
        {room.userRole === 'OWNER' && (
          <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Você é o dono" />
        )}
        {unreadCount > 0 && !isActive && (
          <span className="min-w-[18px] px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </Link>
  )
}

function PublicRoomItem({ room, onJoin }: { room: PublicRoom, onJoin: (roomId: string) => void }) {
  return (
    <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center text-white text-sm font-medium">
        {room.avatar ? (
          <img src={room.avatar} alt={room.name} className="w-full h-full rounded-md object-cover" />
        ) : (
          <Hash className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {room.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {room.memberCount} membro{room.memberCount !== 1 ? 's' : ''}
          {room.description && ` • ${room.description}`}
        </p>
      </div>
      <div className="flex items-center space-x-2">
        {room.isMember ? (
          <Link
            to={`/chat/room/${room.id}`}
            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded"
          >
            Abrir
          </Link>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onJoin(room.id)}
            className="px-2 py-1 text-xs h-6"
          >
            <Plus className="h-3 w-3 mr-1" />
            Entrar
          </Button>
        )}
      </div>
    </div>
  )
}
