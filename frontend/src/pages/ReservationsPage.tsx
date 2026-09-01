import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
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
import { PAGE_SIZE, allowedStatusTransitions } from '@/types/api'
import type {
  FacilityResponse,
  ReservationResponse,
  ReservationStatus,
  UserResponse,
} from '@/types/api'

const ALL = 'all'

interface FormState {
  startTime: string // datetime-local values
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

// Mirrors the backend Create/UpdateReservationRequest validation + service rules.
function validate(form: FormState, isEdit: boolean): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {}
  if (!form.startTime) errors.startTime = 'Start time is required.'
  if (!form.endTime) errors.endTime = 'End time is required.'
  if (form.startTime && form.endTime && new Date(form.endTime) <= new Date(form.startTime))
    errors.endTime = 'End time must be after start time.'
  if (!form.reason.trim()) errors.reason = 'Reason is required.'
  else if (form.reason.length > 500) errors.reason = 'At most 500 characters.'
  const count = Number(form.targetParticipantCount)
  if (!Number.isInteger(count) || count < 1)
    errors.targetParticipantCount = 'Must be a whole number of at least 1.'
  if (!isEdit) {
    if (!form.facilityId) errors.facilityId = 'Pick a facility.'
    if (!form.userId) errors.userId = 'Pick a user.'
  }
  return errors
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

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ReservationResponse | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      // Both filters are sent together — picking one used to silently drop the other.
      const result = await listReservations({
        userId: userFilter !== ALL ? userFilter : undefined,
        facilityId: facilityFilter !== ALL ? facilityFilter : undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      // Deleting the last row of the last page leaves the view past the end.
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

  // A narrower filter can leave the current page beyond the new result set.
  useEffect(() => {
    setPage(1)
  }, [facilityFilter, userFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    listAllFacilities().then(setFacilities).catch(() => setFacilities([]))
    listAllUsers().then(setUsers).catch(() => setUsers([]))
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
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
        toast.success(`Reservation ${editing.reservationId} updated.`)
      } else {
        const created = await createReservation({
          startTime: fromInputValue(form.startTime),
          endTime: fromInputValue(form.endTime),
          reason: form.reason,
          targetParticipantCount: Number(form.targetParticipantCount),
          facilityId: form.facilityId,
          userId: form.userId,
        })
        toast.success(`Reservation ${created.reservationId} created.`)
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
      toast.success(`Reservation ${reservation.reservationId} deleted.`)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <div>
      <PageHeader
        title="Reservations"
        description="Facility bookings — one facility, one time slot, no overlaps."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> New reservation
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          value={facilityFilter}
          onValueChange={(value) => {
            setFacilityFilter(value)
            if (value !== ALL) setUserFilter(ALL)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All facilities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All facilities</SelectItem>
            {facilities.map((facility) => (
              <SelectItem key={facility.id} value={facility.id}>
                {facility.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={userFilter}
          onValueChange={(value) => {
            setUserFilter(value)
            if (value !== ALL) setFacilityFilter(ALL)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All users</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Reserved by</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadError ? (
              <ErrorRow colSpan={8} message={loadError} />
            ) : reservations === null ? (
              <LoadingRow colSpan={8} />
            ) : reservations.length === 0 ? (
              <EmptyRow colSpan={8} message="No reservations match — book one." />
            ) : (
              reservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-mono text-xs">{reservation.reservationId}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatRange(reservation.startTime, reservation.endTime)}
                  </TableCell>
                  <TableCell className="font-medium">{reservation.facilityName}</TableCell>
                  <TableCell>{reservation.userName}</TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">
                    {reservation.reason}
                  </TableCell>
                  <TableCell className="text-center">{reservation.targetParticipantCount}</TableCell>
                  <TableCell>
                    <StatusBadge status={reservation.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(reservation)}>
                      Edit
                    </Button>
                    <ConfirmDelete
                      description={`This permanently deletes reservation ${reservation.reservationId} and removes its participants.`}
                      onConfirm={() => remove(reservation)}
                    />
                  </TableCell>
                </TableRow>
              ))
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editing ? `Edit ${editing.reservationId}` : 'New reservation'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Times, reason, seats and status can change; facility and owner cannot.'
                : 'Book a facility for a user. The slot must be free and the user eligible.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {!editing && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Facility</Label>
                  <Select
                    value={form.facilityId}
                    onValueChange={(value) => setForm({ ...form, facilityId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilities.map((facility) => (
                        <SelectItem key={facility.id} value={facility.id}>
                          {facility.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldErrors.facilityId} />
                </div>
                <div className="grid gap-2">
                  <Label>Reserved by</Label>
                  <Select
                    value={form.userId}
                    onValueChange={(value) => setForm({ ...form, userId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldErrors.userId} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Starts</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
                <FieldError message={fieldErrors.startTime} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">Ends</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
                <FieldError message={fieldErrors.endTime} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={form.reason}
                maxLength={500}
                rows={2}
                placeholder="Project meeting"
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
              <FieldError message={fieldErrors.reason} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="seats">Target participants</Label>
                <Input
                  id="seats"
                  type="number"
                  min={1}
                  value={form.targetParticipantCount}
                  onChange={(e) => setForm({ ...form, targetParticipantCount: e.target.value })}
                />
                <FieldError message={fieldErrors.targetParticipantCount} />
              </div>
              {editing && (
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm({ ...form, status: value as ReservationStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedStatusTransitions(editing.status).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create reservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
