import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/shared/FieldError'
import { errorMessage } from '@/api/client'
import { returnPath, useAuth } from '@/auth/useAuth'
import { validateLogin } from '@/lib/validation'
import type { LoginRequest } from '@/types/api'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState<LoginRequest>({ kfupmId: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginRequest, string>>>({})
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const errors = validateLogin(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      await login(form)
      navigate(returnPath(location.state), { replace: true })
    } catch (error) {
      toast.error(errorMessage(error))
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="text-2xl text-brand-ink sm:text-[1.75rem]">Log in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Log in with your KFUPM ID to book facilities.</p>

      <form
        noValidate
        onSubmit={submit}
        className="mt-8 grid gap-4 rounded-md border border-border bg-card p-6"
      >
        <div className="grid gap-2">
          <Label htmlFor="login-kfupmId">KFUPM ID</Label>
          <Input
            id="login-kfupmId"
            autoComplete="username"
            value={form.kfupmId}
            maxLength={20}
            placeholder="s202100010"
            onChange={(e) => setForm({ ...form, kfupmId: e.target.value })}
          />
          <FieldError message={fieldErrors.kfupmId} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <FieldError message={fieldErrors.password} />
        </div>

        <Button type="submit" disabled={saving} className="mt-2">
          {saving ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        No account yet?{' '}
        <Link to="/register" state={location.state} className="font-medium text-brand-ink hover:underline">
          Register
        </Link>
      </p>
    </div>
  )
}
