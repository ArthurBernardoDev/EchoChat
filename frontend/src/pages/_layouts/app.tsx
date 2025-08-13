import { Outlet, Link } from 'react-router-dom'
import { UserMenu } from '../../components/user-menu'
import { Sidebar } from '../../components/layout/sidebar'
import { MobileNav } from '../../components/layout/mobile-nav'

export function AppLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col">
        <header className="border-b bg-background">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <MobileNav />
              <Link to="/" className="text-xl font-bold hover:text-primary transition-colors cursor-pointer">
                EchoChat
              </Link>
            </div>
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}