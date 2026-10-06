import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Clock, Building2, User, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyRow, ErrorRow, LoadingRow } from '@/components/shared/TableStates'
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
import { formatRange, fromInputValue, toInputValue } from '@/lib/datetime'
import { PAGE_SIZE, RESERVATION_STATUSES } from '@/types/api'
import type {
  FacilityResponse,
  ReservationResponse,
  ReservationStatus,
  UserResponse,
} from '@/types/api'

const ALL = 'all'

interface FormState {
  startTime: string
  endTime: string
  reason: string
  targetParticipantCount: string
  facilityId: string
  userId: string
  status: ReservationStatus
}

const EMPTY_FORM: FormState = {
  startTime: '',
  endTime: '',
  reason: '',
  targetParticipantCount: '1',
  facilityId: '',
  userId: '',
  status: 'Pending',
}

function calculateDuration(start: string, end: string): string | null {
  if (!start || !end) return null
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffMs = endDate.getTime() - startDate.getTime()
  if (diffMs <= 0 || isNaN(diffMs)) return null

  const diffMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMinutes / 60)
  const mins = diffMinutes % 60

  if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`
  if (hours > 0) return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`
  return `${mins} min`
}

function validate(form: FormState, isEdit: boolean): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {}
  if (!isEdit && !form.facilityId) errors.facilityId = 'Select a facility.'
  if (!isEdit && !form.userId) errors.userId = 'Select a user.'
  if (!form.startTime) errors.startTime = 'Start time is required.'
  if (!form.endTime) errors.endTime = 'End time is required.'
  if (form.startTime && form.endTime && form.startTime >= form.endTime) {
    errors.endTime = 'End time must be after start time.'
  }
  const count = Number(form.targetParticipantCount)
  if (!form.targetParticipantCount || isNaN(count) || count < 1) {
    errors.targetParticipantCount = 'Must be at least 1.'
  }
  if (!form.reason.trim()) errors.reason = 'Reason is required.'
  else if (form.reason.length > 200) errors.reason = 'At most 200 characters.'
  return errors
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
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({})
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
    const errors = validate(form, editing !== null)
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
        toast.success('Reservation booked successfully.')
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reservations"
        description="Schedule campus spaces, track bookings, and oversee occupancy in real-time."
        action={
          <Button onClick={openCreate} className="h-8 px-3 text-xs font-semibold shadow-xs">
            <Plus className="size-3.5 mr-1" /> Book Reservation
          </Button>
        }
      />

      {/* Filter and Status Toolbar: Supabase Studio Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 rounded-md bg-secondary p-0.5 border border-border">
            {['ALL', 'Confirmed', 'Pending', 'Cancelled'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st}
              </button>
            ))}
          </div>

          {/* Select Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Building2 className="size-3" /> Facility:
              </span>
              <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                <SelectTrigger className="w-[180px] h-8 text-xs bg-background rounded-md">
                  <SelectValue placeholder="All facilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All facilities</SelectItem>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <User className="size-3" /> Booker:
              </span>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[170px] h-8 text-xs bg-background rounded-md">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(facilityFilter !== ALL || userFilter !== ALL || statusFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setFacilityFilter(ALL)
                  setUserFilter(ALL)
                  setStatusFilter('ALL')
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {loadError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          {loadError}
        </div>
      )}

      {/* Reservations Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Reference</TableHead>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Time & Duration</TableHead>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Facility</TableHead>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Booker</TableHead>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Capacity / Reason</TableHead>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Status</TableHead>
              <TableHead className="text-right font-medium text-xs text-muted-foreground uppercase font-mono">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadError ? (
              <ErrorRow colSpan={7} message={loadError} />
            ) : filteredReservations === null ? (
              <LoadingRow colSpan={7} />
            ) : filteredReservations.length === 0 ? (
              <EmptyRow
                colSpan={7}
                message={
                  facilityFilter !== ALL || userFilter !== ALL || statusFilter !== 'ALL'
                    ? 'No reservations match this filter selection.'
                    : 'No reservations booked yet — click Book Reservation above.'
                }
              />
            ) : (
              filteredReservations.map((reservation) => {
                const transitions = allowedStatusTransitions(reservation.status)
                const durationStr = calculateDuration(reservation.startTime, reservation.endTime)

                return (
                  <TableRow key={reservation.id} className="hover:bg-muted/30 transition-colors">
                    {/* Reference ID */}
                    <TableCell className="font-mono text-xs font-medium text-primary">
                      {reservation.reservationId}
                    </TableCell>

                    {/* Time & Duration */}
                    <TableCell className="whitespace-nowrap text-xs text-foreground">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Clock className="size-3 text-muted-foreground" />
                          <span>{formatRange(reservation.startTime, reservation.endTime)}</span>
                        </div>
                        {durationStr && (
                          <span className="inline-block font-mono text-[10px] text-muted-foreground bg-secondary border border-border px-1.5 py-0.2 rounded">
                            {durationStr}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Facility */}
                    <TableCell className="font-medium text-xs text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                        <span>{reservation.facilityName}</span>
                      </div>
                    </TableCell>

                    {/* Booker */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="flex size-6 items-center justify-center rounded-full bg-secondary border border-border text-[11px] font-medium text-foreground">
                          {reservation.userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-foreground">
                          {reservation.userName}
                        </span>
                      </div>
                    </TableCell>

                    {/* Reason & Capacity */}
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-xs text-foreground" title={reservation.reason}>
                        {reservation.reason}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <UsersRound className="size-3" />
                        <span>Target: {reservation.targetParticipantCount} members</span>
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <StatusBadge status={reservation.status} />
                    </TableCell>

                    {/* Transition Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {transitions.map((target) => (
                          <Button
                            key={target}
                            variant={target === 'Confirmed' ? 'outline' : 'ghost'}
                            size="sm"
                            className={`h-7 px-2 text-xs font-medium ${
                              target === 'Confirmed'
                                ? 'text-primary hover:bg-primary/10 border-primary/30'
                                : 'text-muted-foreground hover:text-destructive'
                            }`}
                            onClick={() => quickStatusChange(reservation, target)}
                          >
                            {target === 'Confirmed' ? 'Confirm' : 'Cancel'}
                          </Button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(reservation)}
                        >
                          Edit
                        </Button>
                        <ConfirmDelete
                          description={`Delete reservation ${reservation.reservationId}?`}
                          onConfirm={() => remove(reservation)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <PaginationControls
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={pageMeta.totalCount}
        totalPages={pageMeta.totalPages}
        onPageChange={setPage}
      />

      {/* Booking Dialog: Supabase Studio Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium tracking-tight">
              {editing ? `Edit ${editing.reservationId}` : 'Schedule Facility Reservation'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editing
                ? 'Update booking time, expected headcount, or approval status.'
                : 'Reserve a campus facility with instant database overlap validation.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {!editing && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Campus Facility</Label>
                  <Select
                    value={form.facilityId}
                    onValueChange={(value) => setForm({ ...form, facilityId: value })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilities.map((facility) => (
                        <SelectItem key={facility.id} value={facility.id}>
                          {facility.name} ({facility.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldErrors.facilityId} />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Booker</Label>
                  <Select
                    value={form.userId}
                    onValueChange={(value) => setForm({ ...form, userId: value })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
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
              <div className="grid gap-1.5">
                <Label htmlFor="startTime" className="text-xs font-medium text-muted-foreground">
                  Start Date & Time
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
                <FieldError message={fieldErrors.startTime} />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="endTime" className="text-xs font-medium text-muted-foreground">
                  End Date & Time
                </Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
                <FieldError message={fieldErrors.endTime} />
              </div>
            </div>

            {/* Calculated Duration Display */}
            {formDuration && (
              <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs text-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3 text-primary" /> Calculated Duration:
                </span>
                <span className="font-mono font-semibold text-primary">{formDuration}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="targetParticipantCount" className="text-xs font-medium text-muted-foreground">
                  Expected Attendees
                </Label>
                <Input
                  id="targetParticipantCount"
                  type="number"
                  min={1}
                  value={form.targetParticipantCount}
                  onChange={(e) => setForm({ ...form, targetParticipantCount: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
                <FieldError message={fieldErrors.targetParticipantCount} />
              </div>

              {editing && (
                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm({ ...form, status: value as ReservationStatus })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
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

            <div className="grid gap-1.5">
              <Label htmlFor="reason" className="text-xs font-medium text-muted-foreground">
                Purpose / Event Description
              </Label>
              <Input
                id="reason"
                value={form.reason}
                maxLength={200}
                placeholder="e.g. Senior Capstone Project Workshop"
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="h-8 text-xs"
              />
              <FieldError message={fieldErrors.reason} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="h-8 text-xs">
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving} className="h-8 text-xs font-semibold">
              {saving ? 'Validating...' : editing ? 'Save Changes' : 'Confirm Reservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
