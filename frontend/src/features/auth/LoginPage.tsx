import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { CircleExclamationPoint, Eye, EyeOff, KeyRound, Sparkles } from 'lucide-react'
import { toast } from '@/components/feedback/toastStore'
import { Button } from '@/components/ui/Button'
import { Checkbox, TextInput } from '@/components/forms/FormControls'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { authService } from '@/services/mock/MockAuthService'
import { AuthError } from '@/services/contracts/AuthService'
import { useSessionStore } from '@/store/sessionStore'
import { DEMO_ROLE_LABELS, type DemoUser } from '@/types/auth'

/**
 * Regulator sign-in (Spec §5.1A). Prototype only: any demo credentials are
 * accepted by the MockAuthService; no real authentication is implied and no
 * credentials are persisted (Spec §17.4).
 */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const startSession = useSessionStore((s) => s.startSession)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([])

  useEffect(() => {
    let active = true
    void authService.listDemoUsers().then((users) => {
      if (active) setDemoUsers(users.filter((u) => !u.portal))
    })
    return () => {
      active = false
    }
  }, [])

  const from = (location.state as { from?: string } | null)?.from ?? '/app/dashboard'

  const validate = (): boolean => {
    const next: { email?: string; password?: string } = {}
    if (!email.trim()) next.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Password is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      const result = await authService.signIn({ email, password, rememberDevice: remember })
      startSession(result)
      toast.success('Demo sign-in complete', `Signed in as ${result.user.fullName}. Saved in prototype session.`)
      navigate(from, { replace: true })
    } catch (error) {
      setFormError(
        error instanceof AuthError
          ? error.message
          : 'Demo sign-in failed unexpectedly. No real service was called.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-card p-8 shadow-card">
      <p className="text-[10px] font-semibold tracking-[1.5px] text-accent-dark uppercase">
        Supervisor workspace
      </p>
      <h1 className="mt-1 text-xl font-bold text-primary">Sign in to Atheris Reg</h1>
      <p className="mt-1 text-xs text-ink-secondary">
        Banking Supervision &amp; Regulatory Intelligence — prototype environment
      </p>

      {formError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-error/30 bg-tint-red p-3 text-xs text-error"
        >
          <CircleExclamationPoint className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          {formError}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-4">
        <TextInput
          label="Email address"
          type="email"
          autoComplete="username"
          placeholder="supervisor@authority.demo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <div className="relative">
          <TextInput
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Any demo password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute top-[34px] right-3 cursor-pointer rounded p-1 text-ink-tertiary transition-colors hover:text-ink"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <Checkbox
            label="Remember this device (visual demo only)"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <Link
            to="/forgot-password"
            className="shrink-0 text-xs font-medium text-primary-surface hover:text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" variant="primary" loading={submitting} className="w-full py-2.5">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full py-2.5"
          iconLeft={<KeyRound className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={() =>
            toast.info('SSO (demo)', 'Single sign-on is not connected in this prototype. Use a demo identity below.')
          }
        >
          Sign in with authority SSO
        </Button>
      </form>

      <div className="mt-6 rounded-lg border border-accent/30 bg-accent/5 p-3">
        <button
          type="button"
          onClick={() => setDemoOpen((v) => !v)}
          aria-expanded={demoOpen}
          className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold text-accent-dark"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Demo identities — any password works
          </span>
          <span aria-hidden="true">{demoOpen ? '−' : '+'}</span>
        </button>
        {demoOpen && (
          <ul className="mt-2 flex flex-col gap-1">
            {demoUsers.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(user.email)
                    setPassword('demo1234')
                    setErrors({})
                  }}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/10"
                >
                  <UserAvatar initials={user.initials} name={user.fullName} size={24} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-ink">{user.fullName}</span>
                    <span className="block truncate text-[10px] text-ink-secondary">
                      {DEMO_ROLE_LABELS[user.role]} · {user.email}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-5 text-center text-[10px] leading-relaxed text-ink-tertiary">
        DEMO ROLE — NOT SECURE AUTHENTICATION. This prototype performs no real sign-in, stores no
        credentials and grants no real access. All data shown after sign-in is fictional.
      </p>
      <p className="mt-3 text-center text-xs text-ink-secondary">
        Supervised institution?{' '}
        <Link to="/portal/login" className="font-medium text-primary-surface hover:text-primary hover:underline">
          Institution Portal sign-in
        </Link>
      </p>
    </div>
  )
}
