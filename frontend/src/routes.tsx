import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from './pages/_layouts/app'
import { AuthLayout } from './pages/_layouts/auth'
import { Dashboard } from './pages/app/dashboard'
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
        children: [{ path: '/', element: <Dashboard /> }],
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