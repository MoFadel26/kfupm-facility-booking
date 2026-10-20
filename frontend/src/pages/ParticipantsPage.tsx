import { useCallback, useEffect, useState } from 'react'
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
import { EmptyRow, ErrorRow, LoadErrorBanner, LoadingRow } from '@/components/shared/TableStates'
import { PaginationControls } from '@/components/shared/PaginationControls'
import {
  createParticipant,
  deleteParticipant,
  listParticipants,
} from '@/api/participants'
import { listAllReservations } from '@/api/reservations'
import { listAllUsers } from '@/api/users'
import { errorMessage } from '@/api/client'
import { humanize } from '@/lib/labels'
import { PAGE_SIZE } from '@/types/api'
import type {
  EventParticipantResponse,
  ReservationResponse,
  UserResponse,
} from '@/types/api'

const ALL = 'all'

export function ParticipantsPage() {
  const [participants, setParticipants] = useState<EventParticipantResponse[] | null>(null)
  const [page, setPage] = useState(1)
  const [pageMeta, setPageMeta] = useState({ totalCount: 0, totalPages: 0 })
  const [loadError, setLoadError] = useState<string | null>(null)

  const [reservationFilter, setReservationFilter] = useState<string>(ALL)
  const [reservations, setReservations] = useState<ReservationResponse[]>([])
  const [users, setUsers] = useState<UserResponse[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [formUserId, setFormUserId] = useState('')
  const [formReservationId, setFormReservationId] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ userId?: string; reservationId?: string }>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await listParticipants({
        reservationId: reservationFilter !== ALL ? reservationFilter : undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      if (result.items.length === 0 && result.totalPages > 0 && page > result.totalPages) {
        setPage(result.totalPages)
        return
      }
      setParticipants(result.items)
      setPageMeta({ totalCount: result.totalCount, totalPages: result.totalPages })
      setLoadError(null)
    } catch (error) {
      setLoadError(errorMessage(error))
    }
  }, [reservationFilter, page])

  useEffect(() => {
    setPage(1)
  }, [reservationFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    listAllUsers().then(setUsers).catch(() => setUsers([]))
    listAllReservations().then(setReservations).catch(() => setReservations([]))
  }, [])

  function openCreate() {
    setFormUserId('')
    setFormReservationId(reservationFilter !== ALL ? reservationFilter : '')
    setFieldErrors({})
    setDialogOpen(true)
  }

  async function submit() {
    const errors: { userId?: string; reservationId?: string } = {}
    if (!formUserId) errors.userId = 'Select a person.'
    if (!formReservationId) errors.reservationId = 'Select a reservation.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      await createParticipant({
        userId: formUserId,
        reservationId: formReservationId,
      })
      toast.success('Participant added.')
      setDialogOpen(false)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function remove(participant: EventParticipantResponse) {
    try {
      await deleteParticipant(participant.id)
      toast.success(`Removed ${participant.userName} from the reservation.`)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const selectedReservationObj = reservations.find((r) => r.reservationId === reservationFilter)

  return (
    <div>
      <PageHeader
        title="Participants"
        description="People attending each reservation."
        action={
          <Button onClick={openCreate}>
            <PlusIcon weight="bold" /> Add participant
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={reservationFilter} onValueChange={setReservationFilter}>
          <SelectTrigger className="w-full max-w-sm" aria-label="Reservation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All reservations</SelectItem>
            {reservations.map((r) => (
              <SelectItem key={r.id} value={r.reservationId}>
                {r.reservationId}: {r.facilityName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {reservationFilter !== ALL && (
          <Button variant="ghost" size="sm" onClick={() => setReservationFilter(ALL)}>
            Clear filter
          </Button>
        )}

        <span className="text-sm text-muted-foreground sm:ml-auto">
          {pageMeta.totalCount} {pageMeta.totalCount === 1 ? 'participant' : 'participants'}
        </span>
      </div>

      {selectedReservationObj && (
        <p className="mb-6 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{selectedReservationObj.facilityName}</span>
          , booked by {selectedReservationObj.userName} for{' '}
          {selectedReservationObj.targetParticipantCount}{' '}
          {selectedReservationObj.targetParticipantCount === 1 ? 'person' : 'people'}.
        </p>
      )}

      <div className="space-y-6">
        <LoadErrorBanner message={loadError} />

        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>KFUPM ID</TableHead>
                <TableHead>Reservation</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead className="w-16">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadError ? (
                <ErrorRow colSpan={5} message={loadError} />
              ) : participants === null ? (
                <LoadingRow colSpan={5} />
              ) : participants.length === 0 ? (
                <EmptyRow
                  colSpan={5}
                  message={
                    reservationFilter !== ALL
                      ? 'Nobody has been added to this reservation yet.'
                      : 'No participants yet.'
                  }
                />
              ) : (
                participants.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.userName}</TableCell>
                    <TableCell>{p.userId}</TableCell>
                    <TableCell>{p.reservationId}</TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate text-muted-foreground" title={p.reservationReason}>
                        {p.reservationReason}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <ConfirmDelete
                        description={`This removes ${p.userName} from reservation ${p.reservationId}.`}
                        onConfirm={() => remove(p)}
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
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Add participant</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="participant-user">Person</Label>
              <Select value={formUserId} onValueChange={setFormUserId}>
                <SelectTrigger id="participant-user" className="w-full">
                  <SelectValue placeholder="Choose a person" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.kfupmId}>
                      {user.name} ({user.kfupmId}, {humanize(user.role)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fieldErrors.userId} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="participant-reservation">Reservation</Label>
              <Select value={formReservationId} onValueChange={setFormReservationId}>
                <SelectTrigger id="participant-reservation" className="w-full">
                  <SelectValue placeholder="Choose a reservation" />
                </SelectTrigger>
                <SelectContent>
                  {reservations.map((reservation) => (
                    <SelectItem key={reservation.id} value={reservation.reservationId}>
                      {reservation.reservationId}: {reservation.facilityName} ({reservation.userName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fieldErrors.reservationId} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
