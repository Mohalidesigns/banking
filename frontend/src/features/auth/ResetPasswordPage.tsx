import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Check, CircleExclamationPoint } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/forms/FormControls'
import { authService } from '@/services/mock/MockAuthService'
import { AuthError } from '@/services/contracts/AuthService'
import { cx } from '@/utils/cx'

/**
 * Reset password prototype (Spec §5.1C): token + password rules +
 * confirmation, simulated success state only.
 */
const RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'case', label: 'Upper and lower case letters', test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: 'number', label: 'At least one number', test: (p: string) => /\d/.test(p) },
]

export function ResetPasswordPage() {
  const [token, setToken] = useState('DEMO-RESET')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    const next: Record<string, string | undefined> = {}
    if (!token.trim()) next.token = 'Reset token is required (demo token: DEMO-RESET).'
    if (!RULES.every((r) => r.test(password))) next.password = 'Password does not meet the rules below.'
    if (password !== confirm) next.confirm = 'Passwords do not match.'
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    setSubmitting(true)
    try {
      await authService.resetPassword({ email: 'demo@atheris-reg.demo', token, password, confirmPassword: confirm })
      setDone(true)
    } catch (err) {
      setFormError(err instanceof AuthError ? err.message : 'Unexpected demo error.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-line bg-card p-8 text-center shadow-card">
        <span
          aria-hidden="true"
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-tint-green text-success"
        >
          <Check className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-bold text-primary">Password reset (simulated)</h1>
        <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-ink-secondary">
          Saved in prototype session only — no real password was changed and no account exists.
        </p>
        <Link to="/login" className="mt-5 block">
          <Button variant="primary" className="w-full py-2.5">
            Return to sign-in
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-line bg-card p-8 shadow-card">
      <h1 className="text-lg font-bold text-primary">Choose a new password</h1>
      <p className="mt-1 text-xs text-ink-secondary">Prototype flow — simulated success only.</p>

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
          label="Reset token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          error={errors.token}
          help="Demo token DEMO-RESET is pre-filled."
          required
          className="font-mono"
        />
        <TextInput
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <ul className="flex flex-col gap-1" aria-label="Password rules">
          {RULES.map((rule) => {
            const met = rule.test(password)
            return (
              <li
                key={rule.id}
                className={cx(
                  'flex items-center gap-1.5 text-[11px]',
                  met ? 'text-success' : 'text-ink-secondary',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    'flex h-3.5 w-3.5 items-center justify-center rounded-full border',
                    met ? 'border-success bg-tint-green' : 'border-gray-300',
                  )}
                >
                  {met && <Check className="h-2.5 w-2.5" />}
                </span>
                {rule.label}
              </li>
            )
          })}
        </ul>
        <TextInput
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          required
        />
        <Button type="submit" variant="primary" loading={submitting} className="w-full py-2.5">
          {submitting ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-ink-secondary">
        <Link to="/login" className="font-medium text-primary-surface hover:text-primary hover:underline">
          Back to sign-in
        </Link>
      </p>
    </div>
  )
}
