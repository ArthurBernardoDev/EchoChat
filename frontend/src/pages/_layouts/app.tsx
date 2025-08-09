import { Outlet } from 'react-router-dom'
import { UserMenu } from '../../components/user-menu'

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">EchoChat</h1>
          <UserMenu />
        </div>
      </header>
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  )
}