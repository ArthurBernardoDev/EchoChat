import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { 
  Users, 
  UserPlus, 
  Search, 
  UserCheck, 
  Clock, 
  User,
  Plus,
  ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'
import { friendsService, Friend, FriendRequest } from '../../../services/friends.service'
import { useAuth } from '../../../contexts/auth.context'
import { useChat } from '../../../contexts/chat.context'

export function FriendsPage() {
  const { user } = useAuth()
  const { 
    onFriendRequestReceived, 
    onFriendRequestResponse, 
    onFriendRemoved 
  } = useChat()
  
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [friendsResponse, requestsResponse] = await Promise.all([
        friendsService.getFriends(),
        friendsService.getFriendRequests()
      ])
      
      // Garantir que os dados são arrays válidos
      const friendsArray = Array.isArray(friendsResponse) ? friendsResponse : []
      const requestsArray = Array.isArray(requestsResponse) ? requestsResponse : []
      
      // Usar os dados diretamente sem filtros restritivos
      const validFriends = friendsArray
      const validRequests = requestsArray
      
      setFriends(validFriends)
      setFriendRequests(validRequests)
    } catch (error) {
      console.error('Erro ao carregar amigos:', error)
      toast.error('Erro ao carregar lista de amigos')
      setFriends([])
      setFriendRequests([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (user) {
      const offFriendReq = onFriendRequestReceived((data) => {
        console.log('📨 Nova solicitação de amizade recebida:', data)
        loadData()
        toast.message(`Nova solicitação de amizade de ${data.sender?.username || 'Usuário desconhecido'}`)
      })
      
      const offFriendResp = onFriendRequestResponse((data) => {
        console.log('📨 Resposta de amizade recebida:', data)
        loadData()
        if (data.status === 'ACCEPTED') {
          toast.success(`${data.receiver?.username || 'Usuário desconhecido'} aceitou sua solicitação de amizade!`)
        }
      })

      const offFriendRemoved = onFriendRemoved((data) => {
        console.log('👥 Amigo removido:', data)
        loadData()
        toast.info('Um amigo foi removido da sua lista')
      })

      return () => {
        offFriendReq()
        offFriendResp()
        offFriendRemoved()
      }
    }
  }, [user, onFriendRequestReceived, onFriendRequestResponse, onFriendRemoved])

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setProcessingRequest(requestId)
      await friendsService.acceptFriendRequest(requestId)
      toast.success('Solicitação aceita!')
      loadData()
    } catch (error: any) {
      console.error('Erro ao aceitar solicitação:', error)
      toast.error(error.response?.data?.message || 'Erro ao aceitar solicitação')
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      setProcessingRequest(requestId)
      await friendsService.declineFriendRequest(requestId)
      toast.success('Solicitação rejeitada')
      loadData()
    } catch (error: any) {
      console.error('Erro ao rejeitar solicitação:', error)
      toast.error(error.response?.data?.message || 'Erro ao rejeitar solicitação')
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      setProcessingRequest(friendshipId)
      await friendsService.removeFriend(friendshipId)
      toast.success('Amigo removido')
      loadData()
    } catch (error: any) {
      console.error('Erro ao remover amigo:', error)
      toast.error(error.response?.data?.message || 'Erro ao remover amigo')
    } finally {
      setProcessingRequest(null)
    }
  }

  const filteredFriends = friends.filter(({ friend }) => {
    if (!friend) return false
    if (!searchQuery) return true
    return friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const pendingRequests = friendRequests.filter(req => req && req.status === 'PENDING')

  if (isLoading) {
    return (
      <>
        <Helmet title="Amigos" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet title="Amigos" />
      <div className="p-4 md:p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="md:hidden">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Amigos
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gerencie suas conexões
              </p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/friends/add">
              <UserPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Adicionar Amigo</span>
              <span className="sm:hidden">Adicionar</span>
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar amigos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Friend Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Solicitações Pendentes ({pendingRequests.length})
              </h2>
            </div>
            <div className="p-4 md:p-6 space-y-4">
                                                {pendingRequests.map((request) => (
                  <div key={request.id || Math.random()} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {request.sender?.username || 'Usuário desconhecido'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Enviou uma solicitação de amizade
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={processingRequest === request.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectRequest(request.id)}
                      disabled={processingRequest === request.id}
                    >
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Todos os Amigos ({filteredFriends.length} de {friends.length})
            </h2>
          </div>
          <div className="p-4 md:p-6">
            {filteredFriends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'Nenhum amigo encontrado' : 'Você ainda não tem amigos'}
                </p>

                {!searchQuery && (
                  <Button asChild className="mt-4">
                    <Link to="/friends/add">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar Primeiro Amigo
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
                            <div className="space-y-4">
                {filteredFriends.map(({ friend, friendshipId }) => (
                  <div key={friendshipId || Math.random()} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                          <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            {friend.avatar ? (
                              <img src={friend.avatar} alt={friend.username} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="text-white font-medium text-sm">
                                {friend.username?.[0]?.toUpperCase() || 'U'}
                              </span>
                            )}
                          </div>
                          <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                            friend.status === 'ONLINE' ? 'bg-green-500' : 
                            friend.status === 'IDLE' ? 'bg-yellow-500' :
                            friend.status === 'DO_NOT_DISTURB' ? 'bg-red-500' : 'bg-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {friend.username || 'Usuário sem nome'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {friend.status === 'ONLINE' ? 'Online' : 
                             friend.status === 'IDLE' ? 'Ausente' :
                             friend.status === 'DO_NOT_DISTURB' ? 'Não Perturbe' : 'Offline'}
                          </p>

                        </div>
                      </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                                                  <Link to={`/chat/dm/${friend.id}`}>
                            Mensagem
                          </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                                                  onClick={() => handleRemoveFriend(friendshipId)}
                                                  disabled={processingRequest === friendshipId}
                        className="text-red-700 hover:text-red-800"
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
