import { Link } from 'react-router'
import { Compass } from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { Button } from '@/components/ui/Button'

/** Designed 404 — no dead ends (Spec §4). */
export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-page p-6">
      <BrandLogo variant="light" />
      <div className="w-full max-w-md rounded-xl border border-line bg-card p-8 text-center shadow-card">
        <span
          aria-hidden="true"
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-tint-blue text-primary"
        >
          <Compass className="h-7 w-7" />
        </span>
        <h1 className="text-xl font-bold text-primary">Page not found</h1>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-ink-secondary">
          This route is not part of the prototype. Every registered module page is reachable from
          the sidebar navigation after signing in.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link to="/app/dashboard">
            <Button variant="primary" className="w-full py-2.5">
              Go to Command Centre
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" className="w-full py-2.5">
              Return to sign-in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
