import { Outlet } from 'react-router'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { ToastHost } from '@/components/feedback/ToastHost'

/**
 * Auth layout (Spec §5.1): navy + gold split screen on large viewports,
 * centered card on small ones. Pages render inside <Outlet />.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-page">
      {/* Brand panel — desktop only */}
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-primary p-10 lg:flex">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, var(--tld-primary-dark) 0%, var(--tld-primary) 55%, var(--tld-primary-surface) 100%)' }}
        />
        <div aria-hidden="true" className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-accent/10" />
        <div aria-hidden="true" className="absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-accent/5" />
        <div className="relative">
          <BrandLogo />
        </div>
        <div className="relative max-w-md">
          <p className="text-accent text-xs font-semibold tracking-[2px] uppercase">
            Banking Supervision &amp; Regulatory Intelligence
          </p>
          <h2 className="mt-3 text-3xl leading-tight font-bold text-white">
            Regulatory Oversight.
            <br />
            Institutional Resilience.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            A single supervisory workspace for off-site surveillance, risk-based supervision,
            on-site examinations, prudential analysis and supervisory action.
          </p>
        </div>
        <p className="relative text-[10px] tracking-wide text-white/50 uppercase">
          Prototype environment — demo data only, not secure authentication
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex w-full flex-col items-center justify-center px-4 py-10 lg:max-w-xl lg:px-10">
        <div className="mb-8 lg:hidden">
          <BrandLogo variant="light" />
        </div>
        <div className="w-full max-w-md">
          <Outlet />
        </div>
        <p className="mt-10 max-w-sm text-center text-[11px] leading-relaxed text-ink-tertiary">
          Confidential supervisory environment (demonstration). All institutions, people and figures
          shown are fictional. This prototype performs no real authentication and stores no
          credentials.
        </p>
      </main>
      <ToastHost />
    </div>
  )
}
