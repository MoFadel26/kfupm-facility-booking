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
import { createUser, deleteUser, listUsers, updateUser } from '@/api/users'
import { errorMessage } from '@/api/client'
import { GENDERS, USER_ROLES } from '@/types/api'
import type { Gender, UserRequest, UserResponse, UserRole } from '@/types/api'

const EMPTY_FORM: UserRequest = {
  kfupmId: '',
  name: '',
  email: '',
  role: 'Student',
  gender: 'Male',
}

// Mirrors the backend UserRequest validation attributes.
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
  const [loadError, setLoadError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<UserResponse | null>(null)
  const [form, setForm] = useState<UserRequest>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof UserRequest, string>>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setUsers(await listUsers())
      setLoadError(null)
    } catch (error) {
      setLoadError(errorMessage(error))
    }
  }, [])

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
        toast.success(`User "${form.name}" created.`)
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

  return (
    <div>
      <PageHeader
        title="Users"
        description="Students, faculty and staff who can reserve facilities."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> New user
          </Button>
        }
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>KFUPM ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadError ? (
              <ErrorRow colSpan={6} message={loadError} />
            ) : users === null ? (
              <LoadingRow colSpan={6} />
            ) : users.length === 0 ? (
              <EmptyRow colSpan={6} message="No users yet — create the first one." />
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-xs">{user.kfupmId}</TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.gender}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                      Edit
                    </Button>
                    <ConfirmDelete
                      description={`This permanently deletes "${user.name}". Users with reservations or participations cannot be deleted.`}
                      onConfirm={() => remove(user)}
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
            <DialogTitle className="font-heading">
              {editing ? 'Edit user' : 'New user'}
            </DialogTitle>
            <DialogDescription>
              {editing ? `Editing ${editing.name}.` : 'Register a person who can use facilities.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="kfupmId">KFUPM ID</Label>
              <Input
                id="kfupmId"
                value={form.kfupmId}
                maxLength={20}
                placeholder="202300001"
                onChange={(e) => setForm({ ...form, kfupmId: e.target.value })}
              />
              <FieldError message={fieldErrors.kfupmId} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                maxLength={100}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <FieldError message={fieldErrors.name} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                maxLength={150}
                placeholder="s202300001@kfupm.edu.sa"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <FieldError message={fieldErrors.email} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm({ ...form, role: value as UserRole })}
                >
                  <SelectTrigger>
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
              <div className="grid gap-2">
                <Label>Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(value) => setForm({ ...form, gender: value as Gender })}
                >
                  <SelectTrigger>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
