import { Outlet } from 'react-router-dom'
import { AuthProvider } from '../contexts/auth.context'
import { UserProfileProvider } from '../contexts/user-profile.context'
import { ChatProvider } from '../contexts/chat.context'

export function AuthWrapper() {
  return (
    <AuthProvider>
      <UserProfileProvider>
        <ChatProvider>
          <Outlet />
        </ChatProvider>
      </UserProfileProvider>
    </AuthProvider>
  )
}
