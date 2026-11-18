import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { CircleExclamationPoint, Eye, EyeOff, LifeBuoy } from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { toast } from '@/components/feedback/toastStore'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/forms/FormControls'
import { authService } from '@/services/mock/MockAuthService'
import { AuthError } from '@/services/contracts/AuthService'
import { useSessionStore } from '@/store/sessionStore'

/**
 * Institution portal sign-in (Spec §5.1B): separate visual entry for
 * supervised institutions — institution code + authorised user email +
 * password. Prototype only.
 */
export function PortalLoginPage() {
  const navigate = useNavigate()
  const startSession = useSessionStore((s) => s.startSession)

  const [institutionCode, setInstitutionCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const validate = (): boolean => {
    const next: Record<string, string | undefined> = {}
    if (!institutionCode.trim()) next.code = 'Institution code is required.'
    if (!email.trim()) next.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Password is required.'
    setErrors(next)
    return Object.values(next).every((v) => !v)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      const result = await authService.portalSignIn({ institutionCode, email, password })
      startSession(result)
      toast.success(
        'Portal demo sign-in complete',
        `Signed in to ${result.user.portal?.institutionName} (fictional). Saved in prototype session.`,
      )
      navigate('/portal/dashboard', { replace: true })
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
    <div className="flex min-h-screen items-center justify-center bg-page p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <BrandLogo variant="light" />
          <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-semibold tracking-wide text-accent-dark uppercase">
            Institution Portal
          </span>
        </div>

        <div className="rounded-xl border border-line bg-card p-8 shadow-card">
          <h1 className="text-lg font-bold text-primary">Institution sign-in</h1>
          <p className="mt-1 text-xs text-ink-secondary">
            For authorised staff of supervised institutions only. Regulator staff should use the{' '}
            <Link to="/login" className="font-medium text-primary-surface hover:underline">
              supervisor sign-in
            </Link>
            .
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
              label="Institution code"
              placeholder="e.g. MCB-001"
              value={institutionCode}
              onChange={(e) => setInstitutionCode(e.target.value.toUpperCase())}
              error={errors.code}
              help="Demo codes: MCB-001 (Meridian Commercial Bank), NMB-002 (Northstar Merchant Bank)."
              required
              className="font-mono"
            />
            <TextInput
              label="Authorised user email"
              type="email"
              autoComplete="username"
              placeholder="you@your-institution.demo"
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
            <Button type="submit" variant="primary" loading={submitting} className="w-full py-2.5">
              {submitting ? 'Signing in…' : 'Sign in to portal'}
            </Button>
          </form>

          <div className="mt-5 flex items-start gap-2 rounded-lg bg-page p-3 text-[11px] leading-relaxed text-ink-secondary">
            <LifeBuoy className="mt-px h-4 w-4 shrink-0 text-primary-surface" aria-hidden="true" />
            <p>
              Need help? Contact your institution&apos;s regulator liaison officer (demo contact —
              portal.help@atheris-reg.demo). Portal access is limited to your own
              institution&apos;s records.
            </p>
          </div>

          <p className="mt-4 text-center text-[10px] leading-relaxed text-ink-tertiary">
            Prototype notice: this portal experience is a demonstration. Sign-in is not real
            authentication, credentials are never stored, and no submission here reaches a
            regulator.
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-ink-secondary">
          <Link to="/forgot-password" className="font-medium text-primary-surface hover:text-primary hover:underline">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  )
}
