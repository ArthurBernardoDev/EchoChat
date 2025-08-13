import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from './pages/_layouts/app'
import { AuthLayout } from './pages/_layouts/auth'
import { Dashboard } from './pages/app/dashboard'
import { Profile } from './pages/app/profile'
import { FriendsPage } from './pages/app/friends'
import { AddFriend } from './pages/app/friends/add'
import { RoomsPage } from './pages/app/rooms'
import { CreateRoom } from './pages/app/rooms/create'
import { ChatRoom } from './pages/app/chat/room'
import { DirectMessage } from './pages/app/chat/dm'
import { SignIn } from './pages/auth/sign-in'
import { SignUp } from './pages/auth/sign-up'
import { ProtectedRoute } from './components/protected-route'
import { AuthWrapper } from './components/auth-wrapper'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AuthWrapper />,
    children: [
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: '/', element: <Dashboard /> },
          { path: '/profile', element: <Profile /> },
          { path: '/friends', element: <FriendsPage /> },
          { path: '/friends/add', element: <AddFriend /> },
          { path: '/rooms', element: <RoomsPage /> },
          { path: '/rooms/create', element: <CreateRoom /> },
          { path: '/chat/room/:roomId', element: <ChatRoom /> },
          { path: '/chat/dm/:friendId', element: <DirectMessage /> },
        ],
      },
      {
        path: '/sign-in',
        element: <AuthLayout />,
        children: [{ path: '/sign-in', element: <SignIn /> }],
      },
      {
        path: '/sign-up',
        element: <AuthLayout />,
        children: [{ path: '/sign-up', element: <SignUp /> }],
      },
    ],
  },
])