import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { 
  Hash, 
  Plus, 
  Search, 
  Users, 
  MessageSquare,
  ArrowLeft,
  Globe,
  Lock,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'
import { roomsService, Room, PublicRoom } from '../../../services/rooms.service'
import { useAuth } from '../../../contexts/auth.context'
import { useChat } from '../../../contexts/chat.context'

export function RoomsPage() {
  const { user } = useAuth()
  const { activeRoomId, unreadSummary } = useChat()
  
  const [rooms, setRooms] = useState<Room[]>([])
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSearchingRooms, setIsSearchingRooms] = useState(false)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const roomsResponse = await roomsService.getUserRooms()
      
      // Garantir que os dados são arrays válidos
      const roomsArray = Array.isArray(roomsResponse) ? roomsResponse : []
      
      // Filtrar dados inválidos
      const validRooms = roomsArray.filter(room => room && room.id)
      
      setRooms(validRooms)
    } catch (error) {
      console.error('Erro ao carregar grupos:', error)
      toast.error('Erro ao carregar lista de grupos')
      setRooms([])
    } finally {
      setIsLoading(false)
    }
  }

  const searchPublicRooms = async (query: string) => {
    if (!query.trim()) {
      setPublicRooms([])
      return
    }

    try {
      setIsSearchingRooms(true)
      const response = await roomsService.searchPublicRooms(query)
      
      // Garantir que os dados são arrays válidos
      const roomsArray = Array.isArray(response) ? response : []
      
      // Filtrar dados inválidos
      const validRooms = roomsArray.filter(room => room && room.id)
      
      setPublicRooms(validRooms)
    } catch (error) {
      console.error('Erro ao buscar grupos públicos:', error)
      toast.error('Erro ao buscar grupos públicos')
      setPublicRooms([])
    } finally {
      setIsSearchingRooms(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPublicRooms(searchQuery)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const filteredRooms = rooms.filter(room =>
    !room.isDirect && room.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getUnreadCount = (roomId: string) => {
    const roomUnread = unreadSummary?.rooms.find(r => r.roomId === roomId)
    return roomUnread?.unreadCount || 0
  }

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'agora'
    if (diffInMinutes < 60) return `${diffInMinutes}min atrás`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`
    return `${Math.floor(diffInMinutes / 1440)}d atrás`
  }

  if (isLoading) {
    return (
      <>
        <Helmet title="Grupos" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet title="Grupos" />
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
                Grupos
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gerencie seus grupos e salas
              </p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/rooms/create">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Criar Grupo</span>
              <span className="sm:hidden">Criar</span>
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar grupos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* My Groups */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Meus Grupos ({filteredRooms.length})
            </h2>
          </div>
          <div className="p-4 md:p-6">
            {filteredRooms.length === 0 ? (
              <div className="text-center py-8">
                <Hash className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'Nenhum grupo encontrado' : 'Você ainda não participa de nenhum grupo'}
                </p>
                {!searchQuery && (
                  <Button asChild className="mt-4">
                    <Link to="/rooms/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Grupo
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRooms.map((room) => {
                  const unreadCount = getUnreadCount(room.id)
                  const isActive = activeRoomId === room.id
                  
                  return (
                    <div key={room.id} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      isActive 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          {room.isPrivate ? (
                            <Lock className="h-6 w-6 text-white" />
                          ) : (
                            <Globe className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {room.name || 'Grupo sem nome'}
                            </p>
                            {room.isPrivate && (
                              <Lock className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {room._count?.users || 0} membros
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              {room._count?.messages || 0} mensagens
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Última atividade: {formatTimeAgo(room.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <Link to={`/chat/room/${room.id}`}>
                            Entrar
                          </Link>
                        </Button>
                        {room.userRole === 'OWNER' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                          >
                            <Link to={`/rooms/${room.id}/settings`}>
                              <Settings className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Public Rooms Search Results */}
        {searchQuery && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Grupos Públicos Encontrados ({publicRooms.length})
              </h2>
            </div>
            <div className="p-4 md:p-6">
              {isSearchingRooms ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600"></div>
                  <span className="ml-2 text-gray-500">Buscando grupos...</span>
                </div>
              ) : publicRooms.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Nenhum grupo público encontrado
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {publicRooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Globe className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {room.name || 'Grupo sem nome'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {room.description || 'Sem descrição'}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {room._count?.users || 0} membros
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              {room._count?.messages || 0} mensagens
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link to={`/rooms/${room.id}/join`}>
                          Entrar
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
