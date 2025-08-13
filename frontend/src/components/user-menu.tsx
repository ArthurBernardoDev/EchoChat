import { useAuth } from '../contexts/auth.context'
import { useUserProfile } from '../contexts/user-profile.context'
import { Button } from './ui/button'
import { LogOut, User, Circle, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

const statusConfig = {
  ONLINE: { color: 'bg-green-500', label: 'Online' },
  IDLE: { color: 'bg-yellow-500', label: 'Ausente' },
  DO_NOT_DISTURB: { color: 'bg-red-500', label: 'Não Perturbe' },
  OFFLINE: { color: 'bg-gray-500', label: 'Invisível' },
}

export function UserMenu() {
  const { user, logout } = useAuth()
  const { profile, isLoading } = useUserProfile()

  if (!user || isLoading || !profile) return null

  const handleLogout = () => {
    logout()
    toast.info('Você foi desconectado')
  }

  const currentStatus = statusConfig[profile.status]

  return (
    <div className="flex items-center gap-2 md:gap-4">
      <Link 
        to="/profile"
        className="flex items-center gap-2 md:gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-accent"
      >
        <div className="relative">
          <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
            {profile.avatar ? (
              <img 
                src={profile.avatar} 
                alt="Avatar" 
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-4 w-4 md:h-5 md:w-5" />
            )}
          </div>

          <div className={`absolute bottom-0 right-0 h-2 w-2 md:h-3 md:w-3 rounded-full border-2 border-background ${currentStatus.color}`} 
               title={currentStatus.label} />
        </div>
        <div className="flex flex-col hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{profile.username}</span>
            <span className="text-xs text-muted-foreground">• {currentStatus.label}</span>
          </div>
          <span className="text-xs text-muted-foreground">{profile.email}</span>
        </div>
      </Link>
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="hidden sm:flex"
        >
          <Link to="/profile">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
