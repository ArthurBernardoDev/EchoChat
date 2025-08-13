import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Search, UserPlus, Users, Clock, Check, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { friendsService, type UserSearchResult } from '../../../services/friends.service'

const searchForm = z.object({
  username: z.string().min(2, 'Digite pelo menos 2 caracteres'),
})

type SearchForm = z.infer<typeof searchForm>

export function AddFriend() {
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SearchForm>({ resolver: zodResolver(searchForm) })

  const searchQuery = watch('username')

  async function handleSearch(data: SearchForm) {
    try {
      setIsSearching(true)
      const results = await friendsService.searchUsers(data.username)
      setSearchResults(results)
    } catch (error) {
      toast.error('Erro ao buscar usuários')
      console.error('Erro na busca:', error)
    } finally {
      setIsSearching(false)
    }
  }

  async function handleSendFriendRequest(username: string) {
    try {
      setSendingRequestTo(username)
      await friendsService.sendFriendRequest(username)
      toast.success('Solicitação de amizade enviada!')
      

      setSearchResults(prev => 
        prev.map(user => 
          user.username === username 
            ? { ...user, friendshipStatus: 'PENDING', hasPendingRequest: true }
            : user
        )
      )
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao enviar solicitação'
      toast.error(message)
    } finally {
      setSendingRequestTo(null)
    }
  }

  const getStatusText = (user: UserSearchResult) => {
    if (user.isFriend) return 'Já são amigos'
    if (user.hasPendingRequest) return 'Solicitação enviada'
    return 'Adicionar amigo'
  }

  const getStatusIcon = (user: UserSearchResult) => {
    if (user.isFriend) return <Check className="h-4 w-4" />
    if (user.hasPendingRequest) return <Clock className="h-4 w-4" />
    return <UserPlus className="h-4 w-4" />
  }

  const getStatusColor = (user: UserSearchResult) => {
    if (user.isFriend) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    if (user.hasPendingRequest) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
  }

  return (
    <>
      <Helmet title="Adicionar Amigo" />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Adicionar Amigo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Encontre amigos pelo username ou email
          </p>
        </div>


        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
          <form onSubmit={handleSubmit(handleSearch)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username ou Email</Label>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Digite o username ou email..."
                    {...register('username')}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" disabled={isSearching || !searchQuery || searchQuery.length < 2}>
                  {isSearching ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>
              {errors.username && (
                <span className="text-xs text-red-500">{errors.username.message}</span>
              )}
            </div>
          </form>
        </div>


        {searchResults.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Resultados da Busca ({searchResults.length})
              </h2>
            </div>
            <div className="divide-y">
              {searchResults.map((user) => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-lg font-medium">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          user.username[0].toUpperCase()
                        )}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${
                        user.status === 'ONLINE' ? 'bg-green-500' :
                        user.status === 'IDLE' ? 'bg-yellow-500' :
                        user.status === 'DO_NOT_DISTURB' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {user.username}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-400">
                        {user.status === 'ONLINE' ? 'Online' : 
                         user.status === 'IDLE' ? 'Ausente' :
                         user.status === 'DO_NOT_DISTURB' ? 'Não Perturbe' : 'Offline'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(user)}`}>
                      {getStatusText(user)}
                    </span>
                    
                    {!user.isFriend && !user.hasPendingRequest && (
                      <Button
                        size="sm"
                        onClick={() => handleSendFriendRequest(user.username)}
                        disabled={sendingRequestTo === user.username}
                      >
                        {sendingRequestTo === user.username ? (
                          'Enviando...'
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Adicionar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {searchResults.length === 0 && searchQuery && !isSearching && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Nenhum usuário encontrado
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Tente buscar por outro username ou email
            </p>
          </div>
        )}
      </div>
    </>
  )
}
