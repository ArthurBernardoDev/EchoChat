import { useAuth } from '../contexts/auth.context'
import { Button } from './ui/button'
import { LogOut, User } from 'lucide-react'
import { toast } from 'sonner'

export function UserMenu() {
  const { user, logout } = useAuth()

  if (!user) return null

  const handleLogout = () => {
    logout()
    toast.info('Você foi desconectado')
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <User className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{user.username}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="flex items-center gap-2"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </div>
  )
}
