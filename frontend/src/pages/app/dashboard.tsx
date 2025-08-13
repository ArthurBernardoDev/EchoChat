import { Helmet } from "react-helmet-async";
import { useAuth } from "../../contexts/auth.context";
import { useChat } from "../../contexts/chat.context";
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { 
  MessageCircle, 
  Users, 
  UserPlus, 
  Plus, 
  Hash,
  User,
  Bell
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { friendsService, type FriendRequest } from "../../services/friends.service";
import { roomsService, type Room } from "../../services/rooms.service";


interface DashboardStats {
  totalFriends: number;
  totalRooms: number;
  onlineFriends: number;
  pendingRequests: number;
  unreadMessages: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const chatContext = useChat();
  
  if (!chatContext) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }
  
  const { 
    rooms, 
    unreadSummary, 
    onFriendRequestReceived, 
    onFriendRequestResponse, 
    onFriendRemoved 
  } = chatContext;
  const [stats, setStats] = useState<DashboardStats>({
    totalFriends: 0,
    totalRooms: 0,
    onlineFriends: 0,
    pendingRequests: 0,
    unreadMessages: 0
  });
  const [recentRooms, setRecentRooms] = useState<Room[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    updateStats();
  }, [rooms, unreadSummary, friendRequests, friends, onlineFriends, allRooms]);

  useEffect(() => {
    if (!user) return;

    const offFriendReq = onFriendRequestReceived((data) => {
      console.log('📨 Nova solicitação de amizade recebida no dashboard:', data);
      loadDashboardData();
      toast.success(`Nova solicitação de amizade de ${data.sender?.username || 'Usuário desconhecido'}`);
    });

    const offFriendResp = onFriendRequestResponse((data) => {
      console.log('📨 Resposta de amizade recebida no dashboard:', data);
      loadDashboardData();
      if (data.status === 'ACCEPTED') {
        toast.success(`${data.receiver?.username || 'Usuário desconhecido'} aceitou sua solicitação de amizade!`);
      }
    });

    const offFriendRemoved = onFriendRemoved((data) => {
      console.log('👥 Amigo removido no dashboard:', data);
      loadDashboardData();
      toast.info('Um amigo foi removido da sua lista');
    });

    return () => {
      offFriendReq();
      offFriendResp();
      offFriendRemoved();
    };
  }, [user, onFriendRequestReceived, onFriendRequestResponse, onFriendRemoved]);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [
        friendRequestsResponse,
        roomsResponse,
        friendsResponse,
        onlineFriendsResponse
      ] = await Promise.all([
        friendsService.getFriendRequests().catch(() => []),
        roomsService.getUserRooms().catch(() => []),
        friendsService.getFriends().catch(() => []),
        friendsService.getOnlineFriends().catch(() => [])
      ]);

      const friendRequests = Array.isArray(friendRequestsResponse) ? friendRequestsResponse : [];
      const pending = friendRequests.filter((req: FriendRequest) => req.status === 'PENDING');
      setFriendRequests(pending);

      const rooms = Array.isArray(roomsResponse) ? roomsResponse : [];
      // Filtrar apenas salas que não são mensagens diretas (DM)
      const groupRooms = rooms.filter((room: Room) => !room.isDirect);
      const sortedRooms = groupRooms
        .sort((a: Room, b: Room) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setAllRooms(sortedRooms);
      setRecentRooms(sortedRooms.slice(0, 5));

      const friends = Array.isArray(friendsResponse) ? friendsResponse : [];
      setFriends(friends);

      const onlineFriends = Array.isArray(onlineFriendsResponse) ? onlineFriendsResponse : [];
      setOnlineFriends(onlineFriends);

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStats = () => {
    const totalUnread = unreadSummary ? unreadSummary.totalUnread : 0;
    const roomsArray = rooms ? Array.from(rooms.values()) : [];

    setStats({
      totalFriends: friends.length,
      totalRooms: allRooms.length,
      onlineFriends: onlineFriends.length,
      pendingRequests: friendRequests.length,
      unreadMessages: totalUnread
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'agora';
    if (diffInMinutes < 60) return `${diffInMinutes}min atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return `${Math.floor(diffInMinutes / 1440)}d atrás`;
  };

  if (isLoading) {
    return (
        <>
          <Helmet title="Dashboard" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet title="Dashboard" />
      <div className="p-4 md:p-6 space-y-6 md:space-y-8">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {getGreeting()}, {user?.username || 'Usuário'}! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Aqui está um resumo das suas atividades no EchoChat
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/friends/add">
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Amigo
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/rooms/create">
                <Plus className="h-4 w-4 mr-2" />
                Criar Sala
              </Link>
            </Button>
          </div>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <MessageCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Mensagens não lidas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.unreadMessages}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Amigos online</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.onlineFriends}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Hash className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Grupos ativos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalRooms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Bell className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Solicitações</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingRequests}</p>
              </div>
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Grupos Recentes</h2>
            </div>
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              {recentRooms.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Nenhum grupo encontrado
                </p>
              ) : (
                recentRooms.map((room) => {

                  const roomUnread = unreadSummary?.rooms.find(r => r.roomId === room.id);
                  const dmUnread = unreadSummary?.directMessages.find(dm => dm.roomId === room.id);
                  const unreadCount = roomUnread?.unreadCount || dmUnread?.unreadCount || 0;
                  
                  return (
                    <Link
                      key={room.id}
                      to={`/chat/room/${room.id}`}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Hash className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{room.name || 'Sala sem nome'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {room._count?.users || 0} membros
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(room.updatedAt)}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>


          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Atividades</h2>
            </div>
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">

              {friendRequests.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Solicitações de Amizade
                  </h3>
                  {friendRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {request.sender?.username || ''}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimeAgo(request.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}


              {unreadSummary && unreadSummary.rooms.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Grupos com Mensagens Não Lidas
                  </h3>
                  <div className="space-y-2">
                    {unreadSummary.rooms.slice(0, 3).map((room) => (
                      <Link
                        key={room.roomId}
                        to={`/chat/room/${room.roomId}`}
                        className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <Hash className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {room.roomName || 'Sala sem nome'}
                          </span>
                        </div>
                        <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {room.unreadCount}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}


              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalFriends}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total de Amigos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalRooms}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Grupos Participando</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
  }