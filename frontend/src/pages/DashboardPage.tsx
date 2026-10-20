import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FacilityIcon } from '@/components/shared/FacilityIcon'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyRow, ErrorRow, LoadErrorBanner, LoadingRow } from '@/components/shared/TableStates'
import { listFacilities } from '@/api/facilities'
import { listParticipants } from '@/api/participants'
import { listAllReservations, listReservations } from '@/api/reservations'
import { listUsers } from '@/api/users'
import { errorMessage } from '@/api/client'
import { formatRangeLines } from '@/lib/datetime'
import { humanize } from '@/lib/labels'
import type { FacilityResponse, ReservationResponse } from '@/types/api'

interface Stats {
  users: number
  facilities: number
  reservations: number
  participants: number
}

function SectionHeading({ title, to, linkLabel }: { title: string; to: string; linkLabel: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Link
        to={to}
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline"
      >
        {linkLabel}
        <ArrowRightIcon weight="bold" className="size-3.5" />
      </Link>
    </div>
  )
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [upcoming, setUpcoming] = useState<ReservationResponse[] | null>(null)
  const [facilities, setFacilities] = useState<FacilityResponse[] | null>(null)
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

  const counts = [
    { one: 'facility', many: 'facilities', value: stats?.facilities, to: '/facilities' },
    { one: 'reservation', many: 'reservations', value: stats?.reservations, to: '/reservations' },
    { one: 'participant', many: 'participants', value: stats?.participants, to: '/participants' },
    { one: 'user', many: 'users', value: stats?.users, to: '/users' },
  ]

  return (
    <div className="space-y-12">
      <section className="cut-corner bg-panel px-6 py-8 text-panel-foreground sm:px-10 sm:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[1.75rem] leading-tight sm:text-[2rem]">Overview</h1>
            <p className="mt-2 max-w-xl text-[0.9375rem]">
              Book rooms, labs and sports facilities across campus.
            </p>
          </div>
          <Button asChild variant="inverse" size="lg" className="self-start md:self-auto">
            <Link to="/reservations">Book a facility</Link>
          </Button>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-panel-rule pt-5 text-[0.9375rem] sm:flex sm:flex-wrap sm:gap-x-8">
          {counts.map((count) => (
            <li key={count.many}>
              <Link to={count.to} className="hover:underline">
                <span className="font-bold tabular-nums">{count.value ?? '–'}</span>{' '}
                {count.value === 1 ? count.one : count.many}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <LoadErrorBanner message={loadError} />

      <section>
        <SectionHeading title="Upcoming reservations" to="/reservations" linkLabel="All reservations" />
        {!loadError && upcoming !== null && (
          <div className="sm:hidden">
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No upcoming reservations.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {upcoming.map((res) => {
                  const when = formatRangeLines(res.startTime, res.endTime)
                  return (
                    <li key={res.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{res.facilityName}</span>
                        <StatusBadge status={res.status} />
                      </div>
                      <div className="text-sm">
                        {when.date}, {when.time}
                      </div>
                      <div className="text-[0.8125rem] text-muted-foreground">
                        {res.reservationId} · {res.userName}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        <div
          className={
            !loadError && upcoming !== null
              ? 'hidden overflow-hidden rounded-md border border-border sm:block'
              : 'overflow-hidden rounded-md border border-border'
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Booked by</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadError ? (
                <ErrorRow colSpan={5} message={loadError} />
              ) : upcoming === null ? (
                <LoadingRow colSpan={5} />
              ) : upcoming.length === 0 ? (
                <EmptyRow colSpan={5} message="No upcoming reservations." />
              ) : (
                upcoming.map((res) => {
                  const when = formatRangeLines(res.startTime, res.endTime)
                  return (
                    <TableRow key={res.id}>
                      <TableCell className="font-medium">{res.reservationId}</TableCell>
                      <TableCell>
                        {when.date}, {when.time}
                      </TableCell>
                      <TableCell>{res.facilityName}</TableCell>
                      <TableCell>{res.userName}</TableCell>
                      <TableCell>
                        <StatusBadge status={res.status} />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <SectionHeading title="Facilities" to="/facilities" linkLabel="All facilities" />
        {facilities === null ? (
          !loadError && <p className="text-sm text-muted-foreground">Loading…</p>
        ) : facilities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No facilities yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {facilities.map((facility) => (
              <li key={facility.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <FacilityIcon type={facility.type} className="size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{facility.name}</div>
                  <div className="text-[0.8125rem] text-muted-foreground">
                    {facility.facilityId} · {humanize(facility.type)}
                  </div>
                </div>
                <div className="text-[0.8125rem] text-muted-foreground">
                  {facility.allowedRole === 'Any' ? 'Any role' : humanize(facility.allowedRole)} ·{' '}
                  {facility.allowedGender === 'Any' ? 'Any gender' : facility.allowedGender}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
