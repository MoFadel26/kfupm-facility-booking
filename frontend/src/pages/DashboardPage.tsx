import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, CalendarRange, UserCheck, UsersRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyRow, ErrorRow, LoadingRow } from '@/components/shared/TableStates'
import { listFacilities } from '@/api/facilities'
import { listParticipants } from '@/api/participants'
import { listReservations } from '@/api/reservations'
import { listUsers } from '@/api/users'
import { errorMessage } from '@/api/client'
import { formatRange } from '@/lib/datetime'
import type { ReservationResponse } from '@/types/api'

interface Stats {
  users: number
  facilities: number
  reservations: number
  participants: number
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [upcoming, setUpcoming] = useState<ReservationResponse[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listUsers(), listFacilities(), listReservations(), listParticipants()])
      .then(([users, facilities, reservations, participants]) => {
        setStats({
          users: users.length,
          facilities: facilities.length,
          reservations: reservations.length,
          participants: participants.length,
        })
        const now = Date.now()
        setUpcoming(
          reservations
            .filter((r) => new Date(r.endTime).getTime() >= now && r.status !== 'Cancelled')
            .slice(0, 5),
        )
        setLoadError(null)
      })
      .catch((error) => setLoadError(errorMessage(error)))
  }, [])

  const cards = [
    { label: 'Users', value: stats?.users, icon: UsersRound, to: '/users' },
    { label: 'Facilities', value: stats?.facilities, icon: Building2, to: '/facilities' },
    { label: 'Reservations', value: stats?.reservations, icon: CalendarRange, to: '/reservations' },
    { label: 'Participants', value: stats?.participants, icon: UserCheck, to: '/participants' },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Campus facility reservations at a glance."
      />

      {loadError && <p className="mb-6 text-sm text-destructive">{loadError}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="font-heading text-3xl font-semibold">{value ?? '—'}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <h3 className="mb-3 mt-10 font-heading text-xl font-semibold">Upcoming reservations</h3>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Reserved by</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadError ? (
              <ErrorRow colSpan={5} message={loadError} />
            ) : upcoming === null ? (
              <LoadingRow colSpan={5} />
            ) : upcoming.length === 0 ? (
              <EmptyRow colSpan={5} message="Nothing upcoming." />
            ) : (
              upcoming.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-mono text-xs">{reservation.reservationId}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatRange(reservation.startTime, reservation.endTime)}
                  </TableCell>
                  <TableCell className="font-medium">{reservation.facilityName}</TableCell>
                  <TableCell>{reservation.userName}</TableCell>
                  <TableCell>
                    <StatusBadge status={reservation.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
