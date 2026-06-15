import { Link, useLocation, Outlet } from 'react-router-dom'
import { FlaskConical, Package, Users, MapPin, LayoutDashboard, LogOut, Menu, X, ShoppingBag, UserCog, Settings } from 'lucide-react'
import { useState } from 'react'
import type { User } from '../types'
import PixelSprite from './PixelSprite'
import { roleSprites } from '../lib/pixelAssets'
import { cn } from '../lib/utils'
import { Button } from './ui/button'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/evidence', label: 'Evidence', icon: FlaskConical },
  { path: '/admin/orders', label: 'Orders', icon: Package },
  { path: '/admin/customers', label: 'Customers', icon: Users },
  { path: '/admin/map', label: 'Meetups', icon: MapPin },
  { path: '/admin/settings/account', label: 'Account', icon: UserCog },
  { path: '/admin/settings/platform', label: 'Platform', icon: Settings },
  { path: '/', label: 'Shop', icon: ShoppingBag },
]

function getRoleBadge(role: string) {
  const colors: Record<string, string> = {
    admin: 'bg-primary text-primary-foreground',
    cook: 'bg-accent text-accent-foreground',
    dealer: 'bg-warning text-white',
    lookout: 'bg-info text-white',
  }
  return colors[role] || 'bg-muted text-muted-foreground'
}

export default function Layout({ user, onLogout }: { user: User; onLogout: () => void }) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-sm">
        <div className="p-6 border-b border-border">
          <Link to="/admin" className="block">
            <h1 className="text-2xl font-display text-primary tracking-wide text-glow-green transform -rotate-1">
              HEISENBERG
            </h1>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-1">Evidence Management</div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const active = isActive(item.path)
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-primary/15 text-primary border-l-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="pixel-frame rounded p-1">
              <PixelSprite src={roleSprites[user.role] || '/assets/pixel/characters/dealer.png'} alt={user.role} size="sm" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{user.username}</div>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${getRoleBadge(user.role)}`}>
                {user.role}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={16} />
            Burn Identity
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/admin" className="font-display text-xl text-primary">HEISENBERG</Link>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-foreground">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {mobileOpen && (
          <nav className="px-4 pb-4 space-y-1 border-t border-border pt-2">
            {navItems.map(item => {
              const active = location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium',
                    active ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              )
            })}
            <button
              onClick={() => { setMobileOpen(false); onLogout(); }}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm text-destructive"
            >
              <LogOut size={16} />
              Burn Identity
            </button>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="lg:p-8 p-4 pt-20 lg:pt-8 min-h-screen chemical-bg">
          <div className="animate-fade-in"><Outlet /></div>
        </div>
      </main>
    </div>
  )
}