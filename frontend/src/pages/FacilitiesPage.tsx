import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MagnifyingGlassIcon, PlusIcon, RowsIcon, SquaresFourIcon } from '@phosphor-icons/react'
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
import { FacilityIcon } from '@/components/shared/FacilityIcon'
import { FieldError } from '@/components/shared/FieldError'
import { PageHeader } from '@/components/shared/PageHeader'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { EmptyRow, ErrorRow, LoadErrorBanner, LoadingRow } from '@/components/shared/TableStates'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { createFacility, deleteFacility, listFacilities, updateFacility } from '@/api/facilities'
import { errorMessage } from '@/api/client'
import { humanize } from '@/lib/labels'
import { ALLOWED_GENDERS, ALLOWED_ROLES, FACILITY_TYPES, PAGE_SIZE } from '@/types/api'
import type {
  AllowedGender,
  AllowedRole,
  FacilityRequest,
  FacilityResponse,
  FacilityType,
} from '@/types/api'
import { validateFacility } from '@/lib/validation'

const EMPTY_FORM: FacilityRequest = {
  facilityId: '',
  name: '',
  type: 'Classroom',
  allowedGender: 'Any',
  allowedRole: 'Any',
}

function eligibility(facility: FacilityResponse) {
  const role = facility.allowedRole === 'Any' ? 'Any role' : humanize(facility.allowedRole)
  const gender = facility.allowedGender === 'Any' ? 'any gender' : facility.allowedGender
  return `${role}, ${gender}`
}

export function FacilitiesPage() {
  const [facilities, setFacilities] = useState<FacilityResponse[] | null>(null)
  const [page, setPage] = useState(1)
  const [pageMeta, setPageMeta] = useState({ totalCount: 0, totalPages: 0 })
  const [loadError, setLoadError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('ALL')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FacilityResponse | null>(null)
  const [form, setForm] = useState<FacilityRequest>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FacilityRequest, string>>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await listFacilities({ page, pageSize: PAGE_SIZE })
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
    const errors = validateFacility(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      if (editing) {
        await updateFacility(editing.id, form)
        toast.success(`Facility "${form.name}" updated.`)
      } else {
        await createFacility(form)
        toast.success(`Facility "${form.name}" added.`)
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

  const filteredFacilities = useMemo(() => {
    if (!facilities) return null
    return facilities.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.facilityId.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = selectedType === 'ALL' || f.type === selectedType
      return matchesSearch && matchesType
    })
  }, [facilities, searchQuery, selectedType])

  const hasFilters = searchQuery !== '' || selectedType !== 'ALL'

  return (
    <div>
      <PageHeader
        title="Facilities"
        description="Rooms, labs and sports facilities that can be booked."
        action={
          <Button onClick={openCreate}>
            <PlusIcon weight="bold" /> Add facility
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <MagnifyingGlassIcon
              weight="bold"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search facilities"
              placeholder="Search by name or code"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-44" aria-label="Facility type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {FACILITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {humanize(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SegmentedControl
          label="View"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'grid', label: <><SquaresFourIcon weight="fill" /> Cards</> },
            { value: 'table', label: <><RowsIcon weight="fill" /> Table</> },
          ]}
        />
      </div>

      <div className="space-y-6">
        <LoadErrorBanner message={loadError} />

        {viewMode === 'grid' &&
          !loadError &&
          (filteredFacilities === null ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filteredFacilities.length === 0 ? (
            <div className="rounded-md border border-dashed border-input px-6 py-12 text-center">
              <h2 className="text-base font-semibold">No facilities found</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasFilters ? 'Change the search or the type filter.' : 'Add the first facility to start taking bookings.'}
              </p>
              {!hasFilters && (
                <Button onClick={openCreate} className="mt-5">
                  <PlusIcon weight="bold" /> Add facility
                </Button>
              )}
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFacilities.map((facility) => (
                <li
                  key={facility.id}
                  className="flex flex-col rounded-md border border-border bg-card p-5"
                >
                  <div className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
                    <FacilityIcon type={facility.type} className="size-5 text-primary" />
                    {humanize(facility.type)}
                    <span className="ml-auto tabular-nums">{facility.facilityId}</span>
                  </div>
                  <h2 className="mt-3 text-base font-semibold">{facility.name}</h2>
                  <p className="mt-1 text-[0.8125rem] text-muted-foreground">{eligibility(facility)}</p>

                  <div className="mt-5 flex items-center gap-1 border-t border-border pt-4">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/reservations?facilityId=${facility.id}`}>Book</Link>
                    </Button>
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={() => openEdit(facility)}>
                      Edit
                    </Button>
                    <ConfirmDelete
                      description={`This deletes "${facility.name}". Facilities with reservations cannot be deleted.`}
                      onConfirm={() => remove(facility)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ))}

        {viewMode === 'table' && (
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Allowed gender</TableHead>
                  <TableHead>Allowed role</TableHead>
                  <TableHead className="w-28">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadError ? (
                  <ErrorRow colSpan={6} message={loadError} />
                ) : filteredFacilities === null ? (
                  <LoadingRow colSpan={6} />
                ) : filteredFacilities.length === 0 ? (
                  <EmptyRow colSpan={6} message="No facilities found." />
                ) : (
                  filteredFacilities.map((facility) => (
                    <TableRow key={facility.id}>
                      <TableCell>{facility.facilityId}</TableCell>
                      <TableCell className="font-medium">{facility.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <FacilityIcon type={facility.type} className="size-4 text-primary" />
                          {humanize(facility.type)}
                        </span>
                      </TableCell>
                      <TableCell>{facility.allowedGender}</TableCell>
                      <TableCell>{humanize(facility.allowedRole)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(facility)}>
                          Edit
                        </Button>
                        <ConfirmDelete
                          description={`This deletes "${facility.name}". Facilities with reservations cannot be deleted.`}
                          onConfirm={() => remove(facility)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

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
            <DialogTitle>{editing ? 'Edit facility' : 'Add facility'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="facilityId">Code</Label>
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
                <Label htmlFor="facility-type">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value as FacilityType })}
                >
                  <SelectTrigger id="facility-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FACILITY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {humanize(type)}
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
                placeholder="Building 22, Room 124"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <FieldError message={fieldErrors.name} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="facility-gender">Allowed gender</Label>
                <Select
                  value={form.allowedGender}
                  onValueChange={(value) =>
                    setForm({ ...form, allowedGender: value as AllowedGender })
                  }
                >
                  <SelectTrigger id="facility-gender" className="w-full">
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
                <Label htmlFor="facility-role">Allowed role</Label>
                <Select
                  value={form.allowedRole}
                  onValueChange={(value) => setForm({ ...form, allowedRole: value as AllowedRole })}
                >
                  <SelectTrigger id="facility-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOWED_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {humanize(role)}
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
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add facility'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
