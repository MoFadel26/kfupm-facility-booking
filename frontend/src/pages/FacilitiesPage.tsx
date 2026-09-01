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
import { Badge } from '@/components/ui/badge'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { FieldError } from '@/components/shared/FieldError'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyRow, ErrorRow, LoadingRow } from '@/components/shared/TableStates'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { createFacility, deleteFacility, listFacilities, updateFacility } from '@/api/facilities'
import { errorMessage } from '@/api/client'
import { ALLOWED_GENDERS, ALLOWED_ROLES, FACILITY_TYPES, PAGE_SIZE } from '@/types/api'
import type {
  AllowedGender,
  AllowedRole,
  FacilityRequest,
  FacilityResponse,
  FacilityType,
} from '@/types/api'

const EMPTY_FORM: FacilityRequest = {
  facilityId: '',
  name: '',
  type: 'Classroom',
  allowedGender: 'Any',
  allowedRole: 'Any',
}

// Mirrors the backend FacilityRequest validation attributes.
function validate(form: FacilityRequest): Partial<Record<keyof FacilityRequest, string>> {
  const errors: Partial<Record<keyof FacilityRequest, string>> = {}
  if (!form.facilityId.trim()) errors.facilityId = 'Facility ID is required.'
  else if (form.facilityId.length > 20) errors.facilityId = 'At most 20 characters.'
  if (!form.name.trim()) errors.name = 'Name is required.'
  else if (form.name.length > 50) errors.name = 'At most 50 characters.'
  return errors
}

export function FacilitiesPage() {
  const [facilities, setFacilities] = useState<FacilityResponse[] | null>(null)
  const [page, setPage] = useState(1)
  const [pageMeta, setPageMeta] = useState({ totalCount: 0, totalPages: 0 })
  const [loadError, setLoadError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FacilityResponse | null>(null)
  const [form, setForm] = useState<FacilityRequest>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FacilityRequest, string>>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await listFacilities({ page, pageSize: PAGE_SIZE })
      // Deleting the last row of the last page leaves the view past the end.
      if (result.items.length === 0 && result.totalPages > 0 && page > result.totalPages) {
        setPage(result.totalPages)
        return
      }
      setFacilities(result.items)
      setPageMeta({ totalCount: result.totalCount, totalPages: result.totalPages })
      setLoadError(null)
    } catch (error) {
      setLoadError(errorMessage(error))
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setDialogOpen(true)
  }

  function openEdit(facility: FacilityResponse) {
    setEditing(facility)
    setForm({
      facilityId: facility.facilityId,
      name: facility.name,
      type: facility.type,
      allowedGender: facility.allowedGender,
      allowedRole: facility.allowedRole,
    })
    setFieldErrors({})
    setDialogOpen(true)
  }

  async function submit() {
    const errors = validate(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      if (editing) {
        await updateFacility(editing.id, form)
        toast.success(`Facility "${form.name}" updated.`)
      } else {
        await createFacility(form)
        toast.success(`Facility "${form.name}" created.`)
      }
      setDialogOpen(false)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function remove(facility: FacilityResponse) {
    try {
      await deleteFacility(facility.id)
      toast.success(`Facility "${facility.name}" deleted.`)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <div>
      <PageHeader
        title="Facilities"
        description="Rooms, labs, courts and other reservable campus spaces."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> New facility
          </Button>
        }
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Facility ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Allowed gender</TableHead>
              <TableHead>Allowed role</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadError ? (
              <ErrorRow colSpan={6} message={loadError} />
            ) : facilities === null ? (
              <LoadingRow colSpan={6} />
            ) : facilities.length === 0 ? (
              <EmptyRow colSpan={6} message="No facilities yet — create the first one." />
            ) : (
              facilities.map((facility) => (
                <TableRow key={facility.id}>
                  <TableCell className="font-mono text-xs">{facility.facilityId}</TableCell>
                  <TableCell className="font-medium">{facility.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{facility.type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{facility.allowedGender}</TableCell>
                  <TableCell className="text-muted-foreground">{facility.allowedRole}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(facility)}>
                      Edit
                    </Button>
                    <ConfirmDelete
                      description={`This permanently deletes "${facility.name}". Facilities with reservations cannot be deleted.`}
                      onConfirm={() => remove(facility)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editing ? 'Edit facility' : 'New facility'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Editing ${editing.name}.`
                : 'Register a reservable space and its access rules.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="facilityId">Facility ID</Label>
                <Input
                  id="facilityId"
                  value={form.facilityId}
                  maxLength={20}
                  placeholder="F-B22-124"
                  onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                />
                <FieldError message={fieldErrors.facilityId} />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value as FacilityType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FACILITY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="facility-name">Name</Label>
              <Input
                id="facility-name"
                value={form.name}
                maxLength={50}
                placeholder="B22 - Room 124"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <FieldError message={fieldErrors.name} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Allowed gender</Label>
                <Select
                  value={form.allowedGender}
                  onValueChange={(value) =>
                    setForm({ ...form, allowedGender: value as AllowedGender })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOWED_GENDERS.map((gender) => (
                      <SelectItem key={gender} value={gender}>
                        {gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Allowed role</Label>
                <Select
                  value={form.allowedRole}
                  onValueChange={(value) => setForm({ ...form, allowedRole: value as AllowedRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOWED_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create facility'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
