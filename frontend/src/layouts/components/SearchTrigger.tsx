import { Search } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

/**
 * Topbar search trigger (Spec §3.3/§3.4). Opens the global search command
 * overlay; ⌘K / Ctrl+K is bound at the layout level.
 */
export function SearchTrigger() {
  const openSearch = useUIStore((s) => s.openSearch)
  return (
    <button
      type="button"
      onClick={openSearch}
      aria-label="Open global search (Command K)"
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-line bg-page text-ink-tertiary transition-colors hover:text-ink md:w-60 md:justify-start md:gap-2 md:px-3.5"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="hidden flex-1 text-left text-[13px] text-ink-secondary md:block">
        Search institutions, returns…
      </span>
      <kbd className="hidden rounded border border-line bg-card px-1.5 py-0.5 font-mono text-[10px] text-ink-tertiary md:block">
        ⌘K
      </kbd>
    </button>
  )
}
