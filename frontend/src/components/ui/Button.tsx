import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { cx } from '@/utils/cx'

/**
 * Buttons per DS §8.5. Primary/danger/ai render uppercase 12px/600 text
 * (DS §3.2); outline/success/warning use sentence case. Disabled = 0.25
 * opacity exactly per DS. Focus ring comes from the global :focus-visible
 * outline (DS §12.2).
 */
export type ButtonVariant = 'primary' | 'outline' | 'danger' | 'success' | 'warning' | 'ai' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'icon' | 'icon-sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Replaces content with a spinner and sets aria-busy (DS §8.5 processing state). */
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent font-semibold cursor-pointer transition-all duration-150 ease-in-out select-none disabled:opacity-25 disabled:pointer-events-none'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-light active:bg-primary-dark uppercase tracking-wide',
  outline: 'bg-card text-primary border-line shadow-sm hover:bg-page normal-case',
  danger: 'bg-error text-white hover:bg-error-light active:bg-[#9B2C2C] uppercase tracking-wide',
  success: 'bg-success text-white hover:bg-success-light normal-case',
  warning: 'bg-warning text-white hover:bg-warning-light normal-case',
  ai: 'bg-success text-white hover:bg-success-light uppercase tracking-wide',
  ghost: 'bg-transparent text-ink-secondary hover:bg-page hover:text-ink normal-case',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[11px]',
  md: 'px-4 py-2 text-xs',
  icon: 'h-9 w-9 p-0',
  'icon-sm': 'h-7 w-7 p-0',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconLeft,
  iconRight,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx(base, variants[variant], sizes[size], className)}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  )
}

export const PrimaryButton = (props: ButtonProps) => <Button variant="primary" {...props} />
export const OutlineButton = (props: ButtonProps) => <Button variant="outline" {...props} />
export const DangerButton = (props: ButtonProps) => <Button variant="danger" {...props} />
export const SuccessButton = (props: ButtonProps) => <Button variant="success" {...props} />
export const WarningButton = (props: ButtonProps) => <Button variant="warning" {...props} />
export const AIButton = (props: ButtonProps) => <Button variant="ai" {...props} />
