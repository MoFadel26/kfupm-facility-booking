import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  CalendarRange,
  UserCheck,
  UsersRound,
  ArrowRight,
  Plus,
  ShieldCheck,
  CalendarPlus,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyRow, ErrorRow, LoadingRow } from '@/components/shared/TableStates'
import { listFacilities } from '@/api/facilities'
import { listParticipants } from '@/api/participants'
import { listAllReservations, listReservations } from '@/api/reservations'
import { listUsers } from '@/api/users'
import { errorMessage } from '@/api/client'
import { formatRange } from '@/lib/datetime'
import type { FacilityResponse, ReservationResponse } from '@/types/api'

interface Stats {
  users: number
  facilities: number
  reservations: number
  participants: number
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [upcoming, setUpcoming] = useState<ReservationResponse[] | null>(null)
  const [facilities, setFacilities] = useState<FacilityResponse[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const countOnly = { page: 1, pageSize: 1 }
    Promise.all([
      listUsers(countOnly),
      listFacilities({ page: 1, pageSize: 6 }),
      listReservations(countOnly),
      listParticipants(countOnly),
      listAllReservations(),
    ])
      .then(([users, facResult, reservations, participants, allReservations]) => {
        setStats({
          users: users.totalCount,
          facilities: facResult.totalCount,
          reservations: reservations.totalCount,
          participants: participants.totalCount,
        })
        setFacilities(facResult.items)
        const now = Date.now()
        setUpcoming(
          allReservations
            .filter((r) => new Date(r.endTime).getTime() >= now && r.status !== 'Cancelled')
            .slice(0, 6),
        )
        setLoadError(null)
      })
      .catch((error) => setLoadError(errorMessage(error)))
  }, [])

  const statCards = [
    {
      label: 'Campus Facilities',
      value: stats?.facilities,
      icon: Building2,
      to: '/facilities',
      desc: 'Active labs, classrooms & sports courts',
    },
    {
      label: 'Total Reservations',
      value: stats?.reservations,
      icon: CalendarRange,
      to: '/reservations',
      desc: 'Scheduled campus activities',
    },
    {
      label: 'Active Participants',
      value: stats?.participants,
      icon: UserCheck,
      to: '/participants',
      desc: 'Attendees registered for events',
    },
    {
      label: 'Registered Members',
      value: stats?.users,
      icon: UsersRound,
      to: '/users',
      desc: 'Faculty, staff & student accounts',
    },
  ]

  return (
    <div className="space-y-10">
      {/* Supabase-style Clean Canvas Hero */}
      <div className="border-b border-border pb-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>KFUPM Resource Allocation Engine</span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Campus Facility Management
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Book university spaces, check real-time availability, manage attendee rosters, and
              coordinate events with guaranteed double-booking prevention.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/reservations">
              <Button className="h-9 px-4 text-xs font-semibold shadow-xs">
                <Plus className="size-3.5 mr-1.5" /> Book a Space
              </Button>
            </Link>
            <Link to="/facilities">
              <Button variant="outline" className="h-9 px-4 text-xs font-medium">
                Browse Facilities
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {/* Metric Tiles: Supabase Minimalist Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-tight text-muted-foreground uppercase">
            System Overview
          </h2>
          <span className="text-xs text-muted-foreground font-mono">Live university counts</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <Link key={card.label} to={card.to} className="group">
                <Card className="h-full rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {card.label}
                    </span>
                    <Icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="mt-3 font-mono text-3xl font-medium tracking-tight text-foreground">
                    {card.value ?? '—'}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{card.desc}</p>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Featured Spaces */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium tracking-tight text-foreground">
              Featured Campus Spaces
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Classrooms, laboratories, and recreation facilities
            </p>
          </div>
          <Link
            to="/facilities"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <span>View all facilities</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facilities.slice(0, 3).map((facility) => (
            <Card
              key={facility.id}
              className="flex flex-col justify-between rounded-lg border border-border bg-card p-5 transition-colors hover:border-border/80"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    {facility.facilityId}
                  </span>
                  <span className="text-[11px] text-muted-foreground uppercase font-mono">
                    {facility.type}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-medium text-foreground">
                  {facility.name}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded border border-border bg-secondary/40 px-2 py-0.5">
                    Gender: {facility.allowedGender}
                  </span>
                  <span className="rounded border border-border bg-secondary/40 px-2 py-0.5">
                    Role: {facility.allowedRole}
                  </span>
                </div>
              </div>

              <div className="mt-5 border-t border-border pt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-primary" /> Reservable
                </span>
                <Link to={`/reservations?facilityId=${facility.id}`}>
                  <Button size="sm" variant="outline" className="h-7 text-xs font-medium gap-1">
                    <CalendarPlus className="size-3" /> Book Now
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Upcoming Schedule Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium tracking-tight text-foreground">
              Upcoming Reservations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nearest scheduled bookings across the university
            </p>
          </div>
          <Link
            to="/reservations"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <span>All reservations</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Reference</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Schedule</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Facility</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Booker</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Status</TableHead>
                <TableHead className="w-24 text-right font-medium text-xs text-muted-foreground uppercase font-mono">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadError ? (
                <ErrorRow colSpan={6} message={loadError} />
              ) : upcoming === null ? (
                <LoadingRow colSpan={6} />
              ) : upcoming.length === 0 ? (
                <EmptyRow colSpan={6} message="No upcoming reservations scheduled." />
              ) : (
                upcoming.map((res) => (
                  <TableRow key={res.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-medium text-foreground">
                      {res.reservationId}
                    </TableCell>
                    <TableCell className="text-xs text-foreground font-mono">
                      {formatRange(res.startTime, res.endTime)}
                    </TableCell>
                    <TableCell className="font-medium text-xs text-foreground">
                      {res.facilityName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {res.userName}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={res.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to="/reservations">
                        <Button variant="ghost" size="sm" className="h-7 text-xs font-medium text-muted-foreground hover:text-foreground">
                          Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Integrity & Postgres Guarantee Card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary border border-border text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">
                KFUPM Reservation Integrity
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-xl leading-relaxed">
                Every reservation is enforced by backend PostgreSQL constraint locks to guarantee zero
                double bookings. Facility rules (role prerequisites and gender allocations) apply to both
                bookers and invited participants.
              </p>
            </div>
          </div>
          <Link to="/facilities">
            <Button variant="outline" size="sm" className="text-xs shrink-0 font-medium">
              Inspect Facilities
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
