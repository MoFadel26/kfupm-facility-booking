import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Building2,
  Search,
  LayoutGrid,
  List,
  GraduationCap,
  FlaskConical,
  Trophy,
  Waves,
  Dumbbell,
  CalendarPlus,
  SlidersHorizontal,
} from 'lucide-react'
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
import { Card } from '@/components/ui/card'
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

function getFacilityIcon(type: FacilityType) {
  switch (type) {
    case 'Laboratory':
      return FlaskConical
    case 'Classroom':
      return GraduationCap
    case 'SportsCourt':
      return Trophy
    case 'SwimmingPool':
      return Waves
    case 'Gym':
      return Dumbbell
    case 'Other':
    default:
      return Building2
  }
}

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

  // Interactive View & Filter Controls
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campus Facilities"
        description="Explore, reserve, and manage lecture halls, laboratories, auditoriums, and athletics complexes."
        action={
          <Button onClick={openCreate} className="h-8 px-3 text-xs font-semibold shadow-xs">
            <Plus className="size-3.5 mr-1" /> Add Facility
          </Button>
        }
      />

      {/* Control Bar: Search, Type Filters, and View Mode Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search facility name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-card rounded-md"
            />
          </div>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[160px] h-8 text-xs bg-card rounded-md">
              <SlidersHorizontal className="size-3 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {FACILITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center rounded-md border border-border bg-card p-0.5">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setViewMode('grid')}
              title="Grid card view"
            >
              <LayoutGrid className="size-3 mr-1" /> Cards
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setViewMode('table')}
              title="Data table view"
            >
              <List className="size-3 mr-1" /> Table
            </Button>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          {loadError}
        </div>
      )}

      {/* Grid View: Supabase Technical Cards */}
      {viewMode === 'grid' && (
        <div>
          {filteredFacilities === null ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-lg border border-border bg-muted/20 animate-pulse"
                />
              ))}
            </div>
          ) : filteredFacilities.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
              <Building2 className="mx-auto size-8 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium text-foreground">No facilities found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {searchQuery || selectedType !== 'ALL'
                  ? 'Try adjusting your filters or search keywords.'
                  : 'Start by creating your first campus facility.'}
              </p>
              <Button onClick={openCreate} size="sm" className="mt-4 h-8 text-xs font-semibold">
                <Plus className="size-3.5 mr-1" /> Create Facility
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFacilities.map((facility) => {
                const IconComponent = getFacilityIcon(facility.type)

                return (
                  <Card
                    key={facility.id}
                    className="group relative flex flex-col justify-between rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
                  >
                    <div>
                      {/* Top Header: Supabase Monolithic Icon & ID Tag */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex size-9 items-center justify-center rounded-md border border-border bg-secondary text-foreground group-hover:text-primary transition-colors">
                          <IconComponent className="size-4" />
                        </div>
                        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded border border-border bg-secondary/60 text-foreground">
                          {facility.facilityId}
                        </span>
                      </div>

                      {/* Name & Type */}
                      <div className="mt-4">
                        <span className="text-[11px] font-mono text-muted-foreground uppercase">
                          {facility.type}
                        </span>
                        <h3 className="mt-1 text-base font-medium tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {facility.name}
                        </h3>
                      </div>

                      {/* Eligibility Attributes */}
                      <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
                        <span className="rounded border border-border bg-secondary/40 px-2 py-0.5 text-muted-foreground text-[11px]">
                          Role: <strong className="text-foreground">{facility.allowedRole}</strong>
                        </span>
                        <span className="rounded border border-border bg-secondary/40 px-2 py-0.5 text-muted-foreground text-[11px]">
                          Gender: <strong className="text-foreground">{facility.allowedGender}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="mt-5 border-t border-border pt-3 flex items-center justify-between">
                      <Link to={`/reservations?facilityId=${facility.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs font-medium gap-1">
                          <CalendarPlus className="size-3" /> Book Space
                        </Button>
                      </Link>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(facility)}
                        >
                          Edit
                        </Button>
                        <ConfirmDelete
                          description={`Permanently delete "${facility.name}". Facilities with existing active reservations cannot be deleted.`}
                          onConfirm={() => remove(facility)}
                        />
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Facility Code</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Name</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Category</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Gender Eligibility</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Role Eligibility</TableHead>
                <TableHead className="w-28 text-right font-medium text-xs text-muted-foreground uppercase font-mono">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadError ? (
                <ErrorRow colSpan={6} message={loadError} />
              ) : filteredFacilities === null ? (
                <LoadingRow colSpan={6} />
              ) : filteredFacilities.length === 0 ? (
                <EmptyRow colSpan={6} message="No facilities match your criteria." />
              ) : (
                filteredFacilities.map((facility) => {
                  const Icon = getFacilityIcon(facility.type)
                  return (
                    <TableRow key={facility.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs font-medium text-primary">
                        {facility.facilityId}
                      </TableCell>
                      <TableCell className="font-medium text-xs text-foreground">
                        <div className="flex items-center gap-2">
                          <Icon className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{facility.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal text-xs rounded-sm">
                          {facility.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {facility.allowedGender}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {facility.allowedRole}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openEdit(facility)}
                        >
                          Edit
                        </Button>
                        <ConfirmDelete
                          description={`This permanently deletes "${facility.name}". Facilities with reservations cannot be deleted.`}
                          onConfirm={() => remove(facility)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      <PaginationControls
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={pageMeta.totalCount}
        totalPages={pageMeta.totalPages}
        onPageChange={setPage}
      />

      {/* Create / Edit Dialog: Supabase Studio Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium tracking-tight">
              {editing ? 'Edit Facility' : 'Create Campus Facility'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editing
                ? `Update configuration and restrictions for ${editing.name}.`
                : 'Register a new reservable campus room, lab, or athletics complex.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="facilityId" className="text-xs font-medium text-muted-foreground">
                  Facility Code
                </Label>
                <Input
                  id="facilityId"
                  value={form.facilityId}
                  maxLength={20}
                  placeholder="e.g. F-B22-124"
                  onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
                <FieldError message={fieldErrors.facilityId} />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Space Category</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value as FacilityType })}
                >
                  <SelectTrigger className="h-8 text-xs">
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

            <div className="grid gap-1.5">
              <Label htmlFor="facility-name" className="text-xs font-medium text-muted-foreground">
                Facility Name
              </Label>
              <Input
                id="facility-name"
                value={form.name}
                maxLength={50}
                placeholder="e.g. Building 22 - Advanced Robotics Lab"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-8 text-xs"
              />
              <FieldError message={fieldErrors.name} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Allowed Gender</Label>
                <Select
                  value={form.allowedGender}
                  onValueChange={(value) =>
                    setForm({ ...form, allowedGender: value as AllowedGender })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
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

              <div className="grid gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Allowed Role</Label>
                <Select
                  value={form.allowedRole}
                  onValueChange={(value) => setForm({ ...form, allowedRole: value as AllowedRole })}
                >
                  <SelectTrigger className="h-8 text-xs">
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

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="h-8 text-xs">
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving} className="h-8 text-xs font-semibold">
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Facility'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
