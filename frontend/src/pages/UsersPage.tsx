import { useCallback, useEffect, useMemo, useState } from 'react'
import { MagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react'
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
import { Badge } from '@/components/ui/badge'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { FieldError } from '@/components/shared/FieldError'
import { PageHeader } from '@/components/shared/PageHeader'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { EmptyRow, ErrorRow, LoadErrorBanner, LoadingRow } from '@/components/shared/TableStates'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { createUser, deleteUser, listUsers, updateUser } from '@/api/users'
import { errorMessage } from '@/api/client'
import { useAuth } from '@/auth/useAuth'
import { humanize } from '@/lib/labels'
import { GENDERS, PAGE_SIZE, USER_ROLES } from '@/types/api'
import type { Gender, UserRequest, UserResponse, UserRole } from '@/types/api'
import { validateUser } from '@/lib/validation'

const EMPTY_FORM: UserRequest = {
  kfupmId: '',
  name: '',
  email: '',
  role: 'Student',
  gender: 'Male',
}

const ROLE_STYLES: Record<UserRole, string> = {
  Admin: 'bg-petrol text-background',
  Faculty: 'border-input bg-background text-foreground',
  Staff: 'bg-petrol-soft text-petrol',
  ClubPresident: 'bg-secondary text-foreground',
  Student: 'bg-secondary text-muted-foreground',
}

export function UsersPage() {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState<UserResponse[] | null>(null)
  const [page, setPage] = useState(1)
  const [pageMeta, setPageMeta] = useState({ totalCount: 0, totalPages: 0 })
  const [loadError, setLoadError] = useState<string | null>(null)

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
    const errors = validateUser(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      if (editing) {
        await updateUser(editing.id, form)
        toast.success(`User "${form.name}" updated.`)
      } else {
        await createUser(form)
        toast.success(`User "${form.name}" added.`)
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

  const columnCount = isAdmin ? 6 : 5

  return (
    <div>
      <PageHeader
        title="Users"
        description="Students, faculty and staff who can book facilities."
        action={
          isAdmin && (
            <Button onClick={openCreate}>
              <PlusIcon weight="bold" /> Add user
            </Button>
          )
        }
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-xs">
          <MagnifyingGlassIcon
            weight="bold"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Search users"
            placeholder="Search by name, email or ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <SegmentedControl
          label="Role"
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: 'ALL', label: 'All roles' },
            ...USER_ROLES.map((role) => ({ value: role, label: humanize(role) })),
          ]}
        />
      </div>

      <div className="space-y-6">
        <LoadErrorBanner message={loadError} />

        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>KFUPM ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Gender</TableHead>
                {isAdmin && (
                  <TableHead className="w-28">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadError ? (
                <ErrorRow colSpan={columnCount} message={loadError} />
              ) : filteredUsers === null ? (
                <LoadingRow colSpan={columnCount} />
              ) : filteredUsers.length === 0 ? (
                <EmptyRow colSpan={columnCount} message="No users found." />
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.kfupmId}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={`font-semibold ${ROLE_STYLES[user.role]}`}>
                        {humanize(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.gender}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                            Edit
                          </Button>
                          <ConfirmDelete
                            description={`This deletes ${user.name} (${user.kfupmId}). Users with reservations or participant records cannot be deleted.`}
                            onConfirm={() => remove(user)}
                          />
                        </div>
                      </TableCell>
                    )}
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
            <DialogTitle>{editing ? 'Edit user' : 'Add user'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="kfupmId">KFUPM ID</Label>
                <Input
                  id="kfupmId"
                  value={form.kfupmId}
                  maxLength={20}
                  placeholder="s202100010"
                  onChange={(e) => setForm({ ...form, kfupmId: e.target.value })}
                />
                <FieldError message={fieldErrors.kfupmId} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="user-role">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm({ ...form, role: value as UserRole })}
                >
                  <SelectTrigger id="user-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {humanize(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-name">Full name</Label>
              <Input
                id="user-name"
                value={form.name}
                maxLength={100}
                placeholder="Ahmed Al-Ghamdi"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <FieldError message={fieldErrors.name} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                maxLength={150}
                placeholder="ghamdi@kfupm.edu.sa"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-gender">Gender</Label>
              <Select
                value={form.gender}
                onValueChange={(value) => setForm({ ...form, gender: value as Gender })}
              >
                <SelectTrigger id="user-gender" className="w-full">
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
