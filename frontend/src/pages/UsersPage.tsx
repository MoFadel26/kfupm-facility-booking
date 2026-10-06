import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Mail } from 'lucide-react'
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
import { createUser, deleteUser, listUsers, updateUser } from '@/api/users'
import { errorMessage } from '@/api/client'
import { GENDERS, PAGE_SIZE, USER_ROLES } from '@/types/api'
import type { Gender, UserRequest, UserResponse, UserRole } from '@/types/api'

const EMPTY_FORM: UserRequest = {
  kfupmId: '',
  name: '',
  email: '',
  role: 'Student',
  gender: 'Male',
}

function getRoleBadge(role: UserRole) {
  switch (role) {
    case 'Faculty':
      return 'border-primary/30 bg-primary/10 text-primary'
    case 'Admin':
      return 'border-[#6b01c2]/30 bg-[#6b01c2]/10 text-[#a855f7]'
    case 'Staff':
      return 'border-border bg-secondary text-foreground'
    case 'Student':
    default:
      return 'border-border bg-secondary/70 text-muted-foreground'
  }
}

function validate(form: UserRequest): Partial<Record<keyof UserRequest, string>> {
  const errors: Partial<Record<keyof UserRequest, string>> = {}
  if (!form.kfupmId.trim()) errors.kfupmId = 'KFUPM ID is required.'
  else if (form.kfupmId.length > 20) errors.kfupmId = 'At most 20 characters.'
  if (!form.name.trim()) errors.name = 'Name is required.'
  else if (form.name.length > 100) errors.name = 'At most 100 characters.'
  if (!form.email.trim()) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email.'
  else if (form.email.length > 150) errors.email = 'At most 150 characters.'
  return errors
}

export function UsersPage() {
  const [users, setUsers] = useState<UserResponse[] | null>(null)
  const [page, setPage] = useState(1)
  const [pageMeta, setPageMeta] = useState({ totalCount: 0, totalPages: 0 })
  const [loadError, setLoadError] = useState<string | null>(null)

  // Interactive filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<UserResponse | null>(null)
  const [form, setForm] = useState<UserRequest>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof UserRequest, string>>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await listUsers({ page, pageSize: PAGE_SIZE })
      if (result.items.length === 0 && result.totalPages > 0 && page > result.totalPages) {
        setPage(result.totalPages)
        return
      }
      setUsers(result.items)
      setPageMeta({ totalCount: result.totalCount, totalPages: result.totalPages })
      setLoadError(null)
    } catch (error) {
      setLoadError(errorMessage(error))
    }
  }, [page])

  useEffect(() => {
    setPage(1)
  }, [roleFilter, searchQuery])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setDialogOpen(true)
  }

  function openEdit(user: UserResponse) {
    setEditing(user)
    setForm({
      kfupmId: user.kfupmId,
      name: user.name,
      email: user.email,
      role: user.role,
      gender: user.gender,
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
        await updateUser(editing.id, form)
        toast.success(`User "${form.name}" updated.`)
      } else {
        await createUser(form)
        toast.success(`User "${form.name}" registered.`)
      }
      setDialogOpen(false)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function remove(user: UserResponse) {
    try {
      await deleteUser(user.id)
      toast.success(`User "${user.name}" deleted.`)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const filteredUsers = useMemo(() => {
    if (!users) return null
    return users.filter((u) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.kfupmId.toLowerCase().includes(q)
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, searchQuery, roleFilter])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campus Community"
        description="Directory of faculty, students, researchers, and administrators authorized to book campus facilities."
        action={
          <Button onClick={openCreate} className="h-8 px-3 text-xs font-semibold shadow-xs">
            <Plus className="size-3.5 mr-1" /> Register Member
          </Button>
        }
      />

      {/* Filter and Search Bar: Supabase Studio Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or KFUPM ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-card rounded-md"
          />
        </div>

        {/* Role Pills */}
        <div className="flex flex-wrap items-center gap-1 rounded-md bg-secondary p-0.5 border border-border">
          {['ALL', ...USER_ROLES].map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                roleFilter === role
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {role === 'ALL' ? 'All Roles' : role}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          {loadError}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Member</TableHead>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">KFUPM ID</TableHead>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Email</TableHead>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Role</TableHead>
              <TableHead className="font-medium text-xs text-muted-foreground uppercase font-mono">Gender</TableHead>
              <TableHead className="w-28 text-right font-medium text-xs text-muted-foreground uppercase font-mono">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadError ? (
              <ErrorRow colSpan={6} message={loadError} />
            ) : filteredUsers === null ? (
              <LoadingRow colSpan={6} />
            ) : filteredUsers.length === 0 ? (
              <EmptyRow colSpan={6} message="No members match your search criteria." />
            ) : (
              filteredUsers.map((user) => {
                const roleBadgeClass = getRoleBadge(user.role)

                return (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                    {/* Name with Avatar */}
                    <TableCell className="font-medium text-xs text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-full bg-secondary border border-border text-[11px] font-medium text-foreground">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>

                    {/* KFUPM ID */}
                    <TableCell className="font-mono text-xs font-medium text-primary">
                      {user.kfupmId}
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="size-3 text-muted-foreground shrink-0" />
                        <span>{user.email}</span>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <Badge variant="outline" className={`font-normal text-xs rounded-full px-2 py-0.5 ${roleBadgeClass}`}>
                        {user.role}
                      </Badge>
                    </TableCell>

                    {/* Gender */}
                    <TableCell className="text-xs text-muted-foreground">
                      {user.gender}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(user)}
                        >
                          Edit
                        </Button>
                        <ConfirmDelete
                          description={`This permanently removes "${user.name}" (${user.kfupmId}). Users with active reservations or participant records cannot be deleted.`}
                          onConfirm={() => remove(user)}
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

      {/* Registration Dialog: Supabase Studio Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium tracking-tight">
              {editing ? 'Edit Member Details' : 'Register Campus Member'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editing
                ? `Update role and directory profile for ${editing.name}.`
                : 'Enroll a student, faculty member, or researcher into the booking system.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="kfupmId" className="text-xs font-medium text-muted-foreground">
                  KFUPM ID
                </Label>
                <Input
                  id="kfupmId"
                  value={form.kfupmId}
                  maxLength={20}
                  placeholder="e.g. s202100010"
                  onChange={(e) => setForm({ ...form, kfupmId: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
                <FieldError message={fieldErrors.kfupmId} />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Campus Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm({ ...form, role: value as UserRole })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="user-name" className="text-xs font-medium text-muted-foreground">
                Full Name
              </Label>
              <Input
                id="user-name"
                value={form.name}
                maxLength={100}
                placeholder="e.g. Dr. Ahmed Al-Ghamdi"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-8 text-xs"
              />
              <FieldError message={fieldErrors.name} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="user-email" className="text-xs font-medium text-muted-foreground">
                KFUPM Email Address
              </Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                maxLength={150}
                placeholder="e.g. ghamdi@kfupm.edu.sa"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-8 text-xs"
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Gender Allocation</Label>
              <Select
                value={form.gender}
                onValueChange={(value) => setForm({ ...form, gender: value as Gender })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((gender) => (
                    <SelectItem key={gender} value={gender}>
                      {gender}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="h-8 text-xs">
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving} className="h-8 text-xs font-semibold">
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Register Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
