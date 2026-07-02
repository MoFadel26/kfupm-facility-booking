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
import { EmptyRow, ErrorRow, LoadingRow } from '@/components/shared/TableStates'
import { createParticipant, deleteParticipant, listParticipants } from '@/api/participants'
import { listReservations } from '@/api/reservations'
import { listUsers } from '@/api/users'
import { errorMessage } from '@/api/client'
import type { EventParticipantResponse, ReservationResponse, UserResponse } from '@/types/api'

const ALL = 'all'

export function ParticipantsPage() {
  const [participants, setParticipants] = useState<EventParticipantResponse[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [users, setUsers] = useState<UserResponse[]>([])
  const [reservations, setReservations] = useState<ReservationResponse[]>([])
  const [reservationFilter, setReservationFilter] = useState<string>(ALL)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [formUserId, setFormUserId] = useState('')
  const [formReservationId, setFormReservationId] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ userId?: string; reservationId?: string }>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const filter = reservationFilter !== ALL ? { reservationId: reservationFilter } : undefined
      setParticipants(await listParticipants(filter))
      setLoadError(null)
    } catch (error) {
      setLoadError(errorMessage(error))
    }
  }, [reservationFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]))
    listReservations().then(setReservations).catch(() => setReservations([]))
  }, [])

  function openCreate() {
    setFormUserId('')
    setFormReservationId('')
    setFieldErrors({})
    setDialogOpen(true)
  }

  async function submit() {
    const errors: { userId?: string; reservationId?: string } = {}
    if (!formUserId) errors.userId = 'Pick a user.'
    if (!formReservationId) errors.reservationId = 'Pick a reservation.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      const created = await createParticipant({
        userId: formUserId,
        reservationId: formReservationId,
      })
      toast.success(`${created.userName} joined ${created.reservationRef}.`)
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
      toast.success(`${participant.userName} removed from ${participant.reservationRef}.`)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const reservationLabel = (reservation: ReservationResponse) =>
    `${reservation.reservationId} — ${reservation.facilityName} (${reservation.reason})`

  return (
    <div>
      <PageHeader
        title="Participants"
        description="Who is attending which reservation. Capacity and facility rules apply."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Add participant
          </Button>
        }
      />

      <div className="mb-4">
        <Select value={reservationFilter} onValueChange={setReservationFilter}>
          <SelectTrigger className="w-96">
            <SelectValue placeholder="All reservations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All reservations</SelectItem>
            {reservations.map((reservation) => (
              <SelectItem key={reservation.id} value={reservation.id}>
                {reservationLabel(reservation)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participant</TableHead>
              <TableHead>KFUPM ID</TableHead>
              <TableHead>Reservation</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="w-16 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadError ? (
              <ErrorRow colSpan={5} message={loadError} />
            ) : participants === null ? (
              <LoadingRow colSpan={5} />
            ) : participants.length === 0 ? (
              <EmptyRow colSpan={5} message="No participants match — add one." />
            ) : (
              participants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell className="font-medium">{participant.userName}</TableCell>
                  <TableCell className="font-mono text-xs">{participant.userKfupmId}</TableCell>
                  <TableCell className="font-mono text-xs">{participant.reservationRef}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {participant.reservationReason}
                  </TableCell>
                  <TableCell className="text-right">
                    <ConfirmDelete
                      description={`Remove ${participant.userName} from ${participant.reservationRef}?`}
                      onConfirm={() => remove(participant)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Add participant</DialogTitle>
            <DialogDescription>
              Join a user to a reservation. The reservation must have free seats and the user must
              satisfy the facility's rules.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>User</Label>
              <Select value={formUserId} onValueChange={setFormUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a user" />
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
            <div className="grid gap-2">
              <Label>Reservation</Label>
              <Select value={formReservationId} onValueChange={setFormReservationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a reservation" />
                </SelectTrigger>
                <SelectContent>
                  {reservations
                    .filter((reservation) => reservation.status !== 'Cancelled')
                    .map((reservation) => (
                      <SelectItem key={reservation.id} value={reservation.id}>
                        {reservationLabel(reservation)}
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
              {saving ? 'Adding…' : 'Add participant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
