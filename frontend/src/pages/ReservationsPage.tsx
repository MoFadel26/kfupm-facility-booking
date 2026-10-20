import { useCallback, useEffect, useMemo, useState } from 'react'
import { PlusIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { FieldError } from '@/components/shared/FieldError'
import { PageHeader } from '@/components/shared/PageHeader'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyRow, ErrorRow, LoadErrorBanner, LoadingRow } from '@/components/shared/TableStates'
import { PaginationControls } from '@/components/shared/PaginationControls'
import {
  createReservation,
  deleteReservation,
  listReservations,
  updateReservation,
} from '@/api/reservations'
import { listAllFacilities } from '@/api/facilities'
import { listAllUsers } from '@/api/users'
import { errorMessage } from '@/api/client'
import { calculateDuration, formatRangeLines, fromInputValue, toInputValue } from '@/lib/datetime'
import { validateReservation } from '@/lib/validation'
import type { ReservationFormState } from '@/lib/validation'
import { PAGE_SIZE, RESERVATION_STATUSES } from '@/types/api'
import type {
  FacilityResponse,
  ReservationResponse,
  ReservationStatus,
  UserResponse,
} from '@/types/api'

const ALL = 'all'

const EMPTY_FORM: ReservationFormState = {
  startTime: '',
  endTime: '',
  reason: '',
  targetParticipantCount: '1',
  facilityId: '',
  userId: '',
  status: 'Pending',
}

function allowedStatusTransitions(current: ReservationStatus): ReservationStatus[] {
  switch (current) {
    case 'Pending':
      return ['Confirmed', 'Cancelled']
    case 'Confirmed':
      return ['Cancelled']
    case 'Cancelled':
      return []
  }
}

export function ReservationsPage() {
  const [reservations, setReservations] = useState<ReservationResponse[] | null>(null)
  const [page, setPage] = useState(1)
  const [pageMeta, setPageMeta] = useState({ totalCount: 0, totalPages: 0 })
  const [loadError, setLoadError] = useState<string | null>(null)

  const [facilities, setFacilities] = useState<FacilityResponse[]>([])
  const [users, setUsers] = useState<UserResponse[]>([])
  const [facilityFilter, setFacilityFilter] = useState<string>(ALL)
  const [userFilter, setUserFilter] = useState<string>(ALL)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ReservationResponse | null>(null)
  const [form, setForm] = useState<ReservationFormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ReservationFormState, string>>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await listReservations({
        facilityId: facilityFilter !== ALL ? facilityFilter : undefined,
        userId: userFilter !== ALL ? userFilter : undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      if (result.items.length === 0 && result.totalPages > 0 && page > result.totalPages) {
        setPage(result.totalPages)
        return
      }
      setReservations(result.items)
      setPageMeta({ totalCount: result.totalCount, totalPages: result.totalPages })
      setLoadError(null)
    } catch (error) {
      setLoadError(errorMessage(error))
    }
  }, [facilityFilter, userFilter, page])

  useEffect(() => {
    setPage(1)
  }, [facilityFilter, userFilter, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    listAllFacilities().then(setFacilities).catch(() => setFacilities([]))
    listAllUsers().then(setUsers).catch(() => setUsers([]))
  }, [])

  function openCreate() {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      facilityId: facilityFilter !== ALL ? facilityFilter : '',
    })
    setFieldErrors({})
    setDialogOpen(true)
  }

  function openEdit(reservation: ReservationResponse) {
    setEditing(reservation)
    setForm({
      startTime: toInputValue(reservation.startTime),
      endTime: toInputValue(reservation.endTime),
      reason: reservation.reason,
      targetParticipantCount: String(reservation.targetParticipantCount),
      facilityId: reservation.facilityId,
      userId: reservation.userId,
      status: reservation.status,
    })
    setFieldErrors({})
    setDialogOpen(true)
  }

  async function submit() {
    const errors = validateReservation(form, editing !== null)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      if (editing) {
        await updateReservation(editing.id, {
          startTime: fromInputValue(form.startTime),
          endTime: fromInputValue(form.endTime),
          reason: form.reason,
          targetParticipantCount: Number(form.targetParticipantCount),
          status: form.status,
        })
        toast.success(`Reservation "${editing.reservationId}" updated.`)
      } else {
        await createReservation({
          facilityId: form.facilityId,
          userId: form.userId,
          startTime: fromInputValue(form.startTime),
          endTime: fromInputValue(form.endTime),
          reason: form.reason,
          targetParticipantCount: Number(form.targetParticipantCount),
        })
        toast.success('Reservation booked.')
      }
      setDialogOpen(false)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function remove(reservation: ReservationResponse) {
    try {
      await deleteReservation(reservation.id)
      toast.success(`Reservation "${reservation.reservationId}" deleted.`)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function quickStatusChange(reservation: ReservationResponse, newStatus: ReservationStatus) {
    try {
      await updateReservation(reservation.id, {
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        reason: reservation.reason,
        targetParticipantCount: reservation.targetParticipantCount,
        status: newStatus,
      })
      toast.success(`Reservation ${reservation.reservationId} set to ${newStatus}.`)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const filteredReservations = useMemo(() => {
    if (!reservations) return null
    if (statusFilter === 'ALL') return reservations
    return reservations.filter((r) => r.status === statusFilter)
  }, [reservations, statusFilter])

  const formDuration = calculateDuration(form.startTime, form.endTime)

  const hasFilters = facilityFilter !== ALL || userFilter !== ALL || statusFilter !== 'ALL'
  const emptyMessage = hasFilters
    ? 'No reservations match these filters.'
    : 'No reservations yet. Use New reservation to book a facility.'

  function renderActions(reservation: ReservationResponse) {
    return (
      <>
        {allowedStatusTransitions(reservation.status).map((target) => (
          <Button
            key={target}
            variant={target === 'Confirmed' ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => quickStatusChange(reservation, target)}
          >
            {target === 'Confirmed' ? 'Confirm' : 'Cancel'}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => openEdit(reservation)}>
          Edit
        </Button>
        <ConfirmDelete
          description={`This deletes reservation ${reservation.reservationId}.`}
          onConfirm={() => remove(reservation)}
        />
      </>
    )
  }

  return (
    <div>
      <PageHeader
        title="Reservations"
        description="Book facilities and manage existing bookings."
        action={
          <Button onClick={openCreate}>
            <PlusIcon weight="bold" /> New reservation
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'ALL', label: 'All' },
            ...RESERVATION_STATUSES.map((status) => ({ value: status, label: status })),
          ]}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Select value={facilityFilter} onValueChange={setFacilityFilter}>
            <SelectTrigger className="w-48" aria-label="Facility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All facilities</SelectItem>
              {facilities.map((f) => (
                <SelectItem key={f.id} value={f.facilityId}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-48" aria-label="Booked by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Anyone</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.kfupmId}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFacilityFilter(ALL)
                setUserFilter(ALL)
                setStatusFilter('ALL')
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <LoadErrorBanner message={loadError} />

        {!loadError && (
          <div className="sm:hidden">
            {filteredReservations === null ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : filteredReservations.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {filteredReservations.map((reservation) => {
                  const when = formatRangeLines(reservation.startTime, reservation.endTime)
                  return (
                    <li key={reservation.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{reservation.reservationId}</span>
                        <StatusBadge status={reservation.status} />
                      </div>
                      <div className="mt-1 font-medium">{reservation.facilityName}</div>
                      <div className="text-sm">
                        {when.date}, {when.time}
                      </div>
                      <div className="mt-1 text-[0.8125rem] text-muted-foreground">
                        {reservation.userName} · {reservation.targetParticipantCount}{' '}
                        {reservation.targetParticipantCount === 1 ? 'attendee' : 'attendees'} ·{' '}
                        {reservation.reason}
                      </div>
                      <div className="mt-2 -ml-3 flex items-center gap-1">{renderActions(reservation)}</div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        <div className="hidden overflow-hidden rounded-md border border-border sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Booked by</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead className="text-right">Attendees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadError ? (
                <ErrorRow colSpan={8} message={loadError} />
              ) : filteredReservations === null ? (
                <LoadingRow colSpan={8} />
              ) : filteredReservations.length === 0 ? (
                <EmptyRow colSpan={8} message={emptyMessage} />
              ) : (
                filteredReservations.map((reservation) => {
                  const when = formatRangeLines(reservation.startTime, reservation.endTime)
                  const duration = calculateDuration(reservation.startTime, reservation.endTime)

                  return (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">{reservation.reservationId}</TableCell>
                      <TableCell>
                        <div>{when.date}</div>
                        <div className="text-[0.8125rem] text-muted-foreground">
                          {when.time}
                          {duration && ` · ${duration}`}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal min-[1440px]:whitespace-nowrap">
                        {reservation.facilityName}
                      </TableCell>
                      <TableCell className="whitespace-normal min-[1440px]:whitespace-nowrap">
                        {reservation.userName}
                      </TableCell>
                      <TableCell className="max-w-44">
                        <p className="truncate" title={reservation.reason}>
                          {reservation.reason}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        {reservation.targetParticipantCount}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={reservation.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {renderActions(reservation)}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <PaginationControls
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={pageMeta.totalCount}
          totalPages={pageMeta.totalPages}
          onPageChange={setPage}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit reservation ${editing.reservationId}` : 'New reservation'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {!editing && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="reservation-facility">Facility</Label>
                  <Select
                    value={form.facilityId}
                    onValueChange={(value) => setForm({ ...form, facilityId: value })}
                  >
                    <SelectTrigger id="reservation-facility" className="w-full">
                      <SelectValue placeholder="Choose a facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilities.map((facility) => (
                        <SelectItem key={facility.id} value={facility.facilityId}>
                          {facility.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldErrors.facilityId} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reservation-user">Booked by</Label>
                  <Select
                    value={form.userId}
                    onValueChange={(value) => setForm({ ...form, userId: value })}
                  >
                    <SelectTrigger id="reservation-user" className="w-full">
                      <SelectValue placeholder="Choose a person" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.kfupmId}>
                          {user.name} ({user.kfupmId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldErrors.userId} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
                <FieldError message={fieldErrors.startTime} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="endTime">End</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
                <FieldError message={fieldErrors.endTime} />
              </div>
            </div>

            {formDuration && (
              <p className="-mt-1 text-[0.8125rem] text-muted-foreground">
                Duration: <span className="font-semibold text-foreground">{formDuration}</span>
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="targetParticipantCount">Expected attendees</Label>
                <Input
                  id="targetParticipantCount"
                  type="number"
                  min={1}
                  value={form.targetParticipantCount}
                  onChange={(e) => setForm({ ...form, targetParticipantCount: e.target.value })}
                />
                <FieldError message={fieldErrors.targetParticipantCount} />
              </div>

              {editing && (
                <div className="grid gap-2">
                  <Label htmlFor="reservation-status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm({ ...form, status: value as ReservationStatus })
                    }
                  >
                    <SelectTrigger id="reservation-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESERVATION_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Purpose</Label>
              <Input
                id="reason"
                value={form.reason}
                maxLength={200}
                placeholder="Senior design project meeting"
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
              <FieldError message={fieldErrors.reason} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Book'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
