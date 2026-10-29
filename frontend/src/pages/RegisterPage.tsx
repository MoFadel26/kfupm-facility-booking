import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldError } from '@/components/shared/FieldError'
import { errorMessage } from '@/api/client'
import { returnPath, useAuth } from '@/auth/useAuth'
import { validateRegister } from '@/lib/validation'
import { GENDERS } from '@/types/api'
import type { Gender, RegisterRequest } from '@/types/api'

const EMPTY_FORM: RegisterRequest = {
  kfupmId: '',
  name: '',
  email: '',
  gender: 'Male',
  password: '',
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState<RegisterRequest>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterRequest, string>>>({})
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const errors = validateRegister(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      await register(form)
      toast.success(`Welcome, ${form.name}.`)
      navigate(returnPath(location.state), { replace: true })
    } catch (error) {
      toast.error(errorMessage(error))
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="text-2xl text-brand-ink sm:text-[1.75rem]">Register</h1>
      <p className="mt-1 text-sm text-muted-foreground">Create an account to book facilities.</p>

      <form
        noValidate
        onSubmit={submit}
        className="mt-8 grid gap-4 rounded-md border border-border bg-card p-6"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="register-kfupmId">KFUPM ID</Label>
            <Input
              id="register-kfupmId"
              autoComplete="username"
              value={form.kfupmId}
              maxLength={20}
              placeholder="s202100010"
              onChange={(e) => setForm({ ...form, kfupmId: e.target.value })}
            />
            <FieldError message={fieldErrors.kfupmId} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="register-gender">Gender</Label>
            <Select
              value={form.gender}
              onValueChange={(value) => setForm({ ...form, gender: value as Gender })}
            >
              <SelectTrigger id="register-gender" className="w-full">
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

        <div className="grid gap-2">
          <Label htmlFor="register-name">Full name</Label>
          <Input
            id="register-name"
            autoComplete="name"
            value={form.name}
            maxLength={100}
            placeholder="Ahmed Al-Ghamdi"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            value={form.email}
            maxLength={150}
            placeholder="ghamdi@kfupm.edu.sa"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <FieldError message={fieldErrors.email} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="register-password">Password</Label>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            maxLength={128}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <FieldError message={fieldErrors.password} />
          {!fieldErrors.password && (
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          )}
        </div>

        <Button type="submit" disabled={saving} className="mt-2">
          {saving ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Already registered?{' '}
        <Link to="/login" state={location.state} className="font-medium text-brand-ink hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
