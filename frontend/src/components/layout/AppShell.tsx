import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Building2,
  CalendarRange,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  UserCheck,
  UsersRound,
  X,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true, badge: 'Hub' },
  { to: '/facilities', label: 'Facilities', icon: Building2, badge: null },
  { to: '/reservations', label: 'Reservations', icon: CalendarRange, badge: null },
  { to: '/participants', label: 'Participants', icon: UserCheck, badge: null },
  { to: '/users', label: 'Campus Users', icon: UsersRound, badge: null },
]

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date())

  return (
    <div className="flex min-h-screen bg-background font-sans antialiased text-foreground">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar: Supabase Studio Dock */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Supabase Brand & Project Selector */}
        <div className="border-b border-sidebar-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Supabase-inspired geometric emerald glyph */}
              <div className="flex size-8 items-center justify-center rounded-md bg-[#171717] dark:bg-[#1f1f1f] border border-[#2e2e2e] shadow-xs">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-primary"
                >
                  <path
                    d="M13.4 2.1C13.8 1.4 14.9 1.6 15 2.5L16.2 11.2C16.3 11.7 16.7 12 17.2 12H21.4C22.2 12 22.7 12.9 22.2 13.5L10.6 22.7C10 23.2 9 22.7 9.2 21.9L10.6 13.5C10.7 12.9 10.3 12.4 9.7 12.4H3.8C3.1 12.4 2.6 11.6 3 11L13.4 2.1Z"
                    fill="currentColor"
                  />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
                    KFUPM
                  </span>
                  <span className="text-muted-foreground text-xs">/</span>
                  <span className="text-xs font-mono text-muted-foreground">booking</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[11px] text-muted-foreground">Dhahran Campus</span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground/70 hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          <div className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Platform
          </div>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group flex items-center justify-between rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-foreground font-semibold'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-foreground',
                )
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={cn(
                    'size-4 transition-colors',
                    location.pathname === to || (end && location.pathname === '/')
                      ? 'text-primary'
                      : 'text-muted-foreground group-hover:text-foreground',
                  )}
                />
                <span>{label}</span>
              </div>
              {badge && (
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Database Engine Status */}
        <div className="border-t border-sidebar-border p-3.5 bg-sidebar/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="size-3.5 text-primary" /> PostgreSQL Engine
            </span>
            <span className="font-mono text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded text-foreground">
              v16 · lock
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> {todayStr}
            </span>
            <a
              href="http://localhost:5049/scalar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <span>API Docs</span>
              <ExternalLink className="size-2.5" />
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/90 px-4 sm:px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden size-8 rounded-md"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="size-4" />
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="hover:text-foreground transition-colors hidden sm:inline">King Fahd University</span>
              <span className="text-border hidden sm:inline">/</span>
              <span className="text-foreground font-medium">Facility Booking Studio</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>Real-time concurrency lock active</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Dynamic Page Outlet */}
        <main className="min-w-0 flex-1 p-4 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
