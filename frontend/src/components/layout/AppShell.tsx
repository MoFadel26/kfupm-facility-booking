import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BuildingsIcon,
  CalendarBlankIcon,
  HouseIcon,
  ListIcon,
  SignInIcon,
  SignOutIcon,
  UserListIcon,
  UsersThreeIcon,
  XIcon,
} from '@phosphor-icons/react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Button } from '@/components/ui/button'
import { returnTo, useAuth } from '@/auth/useAuth'
import { humanize } from '@/lib/labels'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: HouseIcon, end: true },
  { to: '/facilities', label: 'Facilities', icon: BuildingsIcon },
  { to: '/reservations', label: 'Reservations', icon: CalendarBlankIcon },
  { to: '/participants', label: 'Participants', icon: UserListIcon },
  { to: '/users', label: 'Users', icon: UsersThreeIcon },
]

function AppName() {
  return (
    <div className="leading-tight">
      <div className="text-lg font-bold tracking-tight text-brand-ink">KFUPM</div>
      <div className="text-[0.8125rem] text-sidebar-foreground">Facility Booking</div>
    </div>
  )
}

function AccountControls({ onNavigate }: { onNavigate: () => void }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const onAuthPage = location.pathname === '/login' || location.pathname === '/register'

  if (!user) {
    return (
      <Button asChild variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground">
        <Link to="/login" state={onAuthPage ? undefined : returnTo(location)} onClick={onNavigate}>
          <SignInIcon weight="bold" /> Log in
        </Link>
      </Button>
    )
  }

  return (
    <>
      <div className="px-3 pb-1">
        <div className="truncate text-sm font-semibold text-foreground">{user.name}</div>
        <div className="text-[0.8125rem] text-muted-foreground">{humanize(user.role)}</div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-sidebar-foreground"
        onClick={() => {
          logout()
          onNavigate()
        }}
      >
        <SignOutIcon weight="bold" /> Log out
      </Button>
    </>
  )
}

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0b1518]/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-5">
          <AppName />
          <Button
            variant="ghost"
            size="icon-sm"
            className="-mr-2 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          >
            <XIcon weight="bold" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-secondary hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    weight="fill"
                    className={cn('size-5', isActive ? 'text-primary' : 'text-muted-foreground')}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-sidebar-border px-3 pt-3 pb-4">
          <AccountControls onNavigate={() => setMobileMenuOpen(false)} />
          <ThemeToggle />
        </div>
        <div className="brand-gradient h-1 shrink-0" aria-hidden="true" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <ListIcon weight="bold" className="size-5" />
            </Button>
            <span className="text-base font-bold text-brand-ink">KFUPM</span>
            <span className="text-sm text-muted-foreground">Facility Booking</span>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
