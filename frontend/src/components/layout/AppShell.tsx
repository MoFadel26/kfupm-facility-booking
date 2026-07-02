import { NavLink, Outlet } from 'react-router-dom'
import {
  Building2,
  CalendarRange,
  LayoutDashboard,
  UsersRound,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Users', icon: UsersRound },
  { to: '/facilities', label: 'Facilities', icon: Building2 },
  { to: '/reservations', label: 'Reservations', icon: CalendarRange },
  { to: '/participants', label: 'Participants', icon: UserCheck },
]

export function AppShell() {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="border-b border-sidebar-border px-5 py-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-sidebar-foreground/60">
            KFUPM
          </p>
          <h1 className="mt-1 font-heading text-xl font-semibold leading-tight text-sidebar-accent-foreground">
            Resource
            <br />
            Manager
          </h1>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="font-mono text-[11px] text-sidebar-foreground/50">
            Facility reservation ledger
          </p>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
