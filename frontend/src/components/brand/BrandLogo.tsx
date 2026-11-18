import { ShieldHalf } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/utils/cx'

/**
 * Atheris Reg brand lockup (Spec §2.1, DS §1.2):
 * 36×36 rounded square with the gold gradient + white shield glyph,
 * "Atheris Reg" 16px/700 and "BANKING SUPERVISION" 10px/500 gold subtitle.
 */
interface BrandLogoProps {
  /** `dark` renders white product text (on navy); `light` renders navy text (on white). */
  variant?: 'dark' | 'light'
  /** Icon only (collapsed sidebar rail). */
  iconOnly?: boolean
  className?: string
  /** Accessible description; defaults to the product name. */
  label?: ReactNode
}

export function BrandLogo({
  variant = 'dark',
  iconOnly = false,
  className,
  label = 'Atheris Reg — Banking Supervision',
}: BrandLogoProps) {
  return (
    <span className={cx('flex items-center gap-3', className)} aria-label={typeof label === 'string' ? label : undefined}>
      <span
        aria-hidden="true"
        className="tld-gradient-logo flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
      >
        <ShieldHalf className="h-[18px] w-[18px] text-white" strokeWidth={2} />
      </span>
      {!iconOnly && (
        <span className="flex flex-col leading-tight">
          <span
            className={cx(
              'text-base font-bold tracking-[0.5px]',
              variant === 'dark' ? 'text-white' : 'text-primary',
            )}
          >
            Atheris Reg
          </span>
          <span className="text-accent text-[10px] font-medium tracking-[1px] uppercase">
            Banking Supervision
          </span>
        </span>
      )}
    </span>
  )
}
