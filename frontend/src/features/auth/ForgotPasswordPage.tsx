import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { CircleCheck, CircleExclamationPoint } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/forms/FormControls'
import { authService } from '@/services/mock/MockAuthService'
import { AuthError } from '@/services/contracts/AuthService'

/**
 * Forgot password prototype (Spec §5.1C): email field + simulated
 * confirmation. No email is sent; the message says so explicitly.
 */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    setError(undefined)
    setSubmitting(true)
    try {
      const result = await authService.requestPasswordReset(email)
      setConfirmation(result.message)
    } catch (err) {
      setFormError(err instanceof AuthError ? err.message : 'Unexpected demo error.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-card p-8 shadow-card">
      <h1 className="text-lg font-bold text-primary">Reset your password</h1>
      <p className="mt-1 text-xs text-ink-secondary">
        Enter the email associated with your supervisory or institution account.
      </p>

      {confirmation ? (
        <div className="mt-6">
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-lg border border-success/30 bg-tint-green p-4 text-xs leading-relaxed text-success"
          >
            <CircleCheck className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{confirmation}</span>
          </div>
          <Link to="/reset-password" className="mt-4 block">
            <Button variant="primary" className="w-full py-2.5">
              Continue to reset form (demo)
            </Button>
          </Link>
        </div>
      ) : (
        <>
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
              placeholder="you@authority.demo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
              required
            />
            <Button type="submit" variant="primary" loading={submitting} className="w-full py-2.5">
              {submitting ? 'Submitting…' : 'Send reset instructions'}
            </Button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-xs text-ink-secondary">
        <Link to="/login" className="font-medium text-primary-surface hover:text-primary hover:underline">
          Back to sign-in
        </Link>
      </p>
      <p className="mt-4 text-center text-[10px] text-ink-tertiary">
        Prototype flow — simulated success only. No email is sent and no password exists.
      </p>
    </div>
  )
}
