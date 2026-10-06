import { useCallback, useEffect, useState } from 'react'
import { Plus, CalendarRange, Building2 } from 'lucide-react'
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
import { PaginationControls } from '@/components/shared/PaginationControls'
import {
  createParticipant,
  deleteParticipant,
  listParticipants,
} from '@/api/participants'
import { listAllReservations } from '@/api/reservations'
import { listAllUsers } from '@/api/users'
import { errorMessage } from '@/api/client'
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
    if (!formUserId) errors.userId = 'Select a campus member.'
    if (!formReservationId) errors.reservationId = 'Select a reservation.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      await createParticipant({
        userId: formUserId,
        reservationId: formReservationId,
      })
      toast.success('Participant added to reservation roster.')
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
      toast.success(`Removed ${participant.userName} from reservation.`)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const selectedReservationObj = reservations.find((r) => r.reservationId === reservationFilter)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Event Participants"
        description="Oversee attendee rosters, verify member eligibility, and register participants for campus spaces."
        action={
          <Button onClick={openCreate} className="h-8 px-3 text-xs font-semibold shadow-xs">
            <Plus className="size-3.5 mr-1" /> Add Participant
          </Button>
        }
      />

      {/* Filter and Active Reservation Banner: Supabase Studio Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <CalendarRange className="size-3.5" /> Scope Reservation:
            </span>
            <Select value={reservationFilter} onValueChange={setReservationFilter}>
              <SelectTrigger className="w-[300px] h-8 text-xs bg-background rounded-md">
                <SelectValue placeholder="All reservations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All reservations ({reservations.length})</SelectItem>
                {reservations.map((r) => (
                  <SelectItem key={r.id} value={r.reservationId}>
                    {r.reservationId} — {r.facilityName} ({r.userName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {reservationFilter !== ALL && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setReservationFilter(ALL)}
              >
                Clear Scope
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            Roster Entries: <strong className="text-foreground">{pageMeta.totalCount}</strong>
          </div>
        </div>

        {selectedReservationObj && (
          <div className="rounded-md bg-secondary border border-border p-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Building2 className="size-3 text-primary" /> {selectedReservationObj.facilityName}
              </span>
              <span className="text-muted-foreground">
                Booked by: <strong className="text-foreground">{selectedReservationObj.userName}</strong>
              </span>
            </div>
            <span className="text-muted-foreground font-mono">
              Target: {selectedReservationObj.targetParticipantCount} members
            </span>
          </div>
        )}
      </div>

      {loadError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          {loadError}
        </div>
      )}

      {/* Participants Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Participant</TableHead>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">KFUPM ID</TableHead>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Reservation Ref</TableHead>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Activity Purpose</TableHead>
              <TableHead className="w-24 text-right font-medium text-xs text-muted-foreground uppercase font-mono">Action</TableHead>
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
                    ? 'No participants registered for this reservation yet.'
                    : 'No participants recorded across any reservations.'
                }
              />
            ) : (
              participants.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium text-xs text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-full bg-secondary border border-border text-[11px] font-medium text-foreground">
                        {p.userName.charAt(0).toUpperCase()}
                      </div>
                      <span>{p.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium text-primary">
                    {p.userId}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground">
                    {p.reservationId}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={p.reservationReason}>
                    {p.reservationReason}
                  </TableCell>
                  <TableCell className="text-right">
                    <ConfirmDelete
                      description={`Remove ${p.userName} from this reservation roster?`}
                      onConfirm={() => remove(p)}
                    />
                  </TableCell>
                </TableRow>
              ))
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

      {/* Add Participant Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium tracking-tight">Add Event Participant</DialogTitle>
            <DialogDescription className="text-xs">
              Enroll a university member into an existing space reservation roster.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Select Campus Member</Label>
              <Select value={formUserId} onValueChange={setFormUserId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.kfupmId}>
                      {user.name} ({user.kfupmId} · {user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fieldErrors.userId} />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Target Reservation</Label>
              <Select value={formReservationId} onValueChange={setFormReservationId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose reservation" />
                </SelectTrigger>
                <SelectContent>
                  {reservations.map((reservation) => (
                    <SelectItem key={reservation.id} value={reservation.reservationId}>
                      {reservation.reservationId} — {reservation.facilityName} ({reservation.userName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fieldErrors.reservationId} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="h-8 text-xs">
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving} className="h-8 text-xs font-semibold">
              {saving ? 'Adding...' : 'Add to Roster'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
