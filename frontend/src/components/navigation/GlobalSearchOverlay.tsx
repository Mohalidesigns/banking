import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import {
  Building,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  FileText,
  Gavel,
  Search,
  SearchX,
  TriangleExclamationPoint,
  X,
} from 'lucide-react'
import { searchService } from '@/services/mock/MockSearchService'
import { SEARCH_GROUP_ORDER, type SearchEntityGroup, type SearchResultItem } from '@/services/contracts/SearchService'
import { useUIStore } from '@/store/uiStore'

/**
 * Global search command overlay (Spec §3.4): keyboard shortcut hint, recent
 * searches, results grouped by Institutions / Examinations / Findings /
 * Returns / Directives / Reports, select navigates to the detail page,
 * no-result state and clear action. Mock results only.
 */
const groupIcons: Record<SearchEntityGroup, typeof Building> = {
  Institutions: Building,
  Examinations: ClipboardList,
  Findings: TriangleExclamationPoint,
  Returns: FileSpreadsheet,
  Directives: Gavel,
  Reports: FileText,
}

export function GlobalSearchOverlay() {
  const open = useUIStore((s) => s.searchOpen)
  const closeSearch = useUIStore((s) => s.closeSearch)
  const recentSearches = useUIStore((s) => s.recentSearches)
  const addRecentSearch = useUIStore((s) => s.addRecentSearch)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    } else {
      setQuery('')
      setResults([])
      setSearching(false)
    }
  }, [open])

  // Debounced mock search.
  useEffect(() => {
    if (!open) return
    if (query.trim().length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = setTimeout(() => {
      void searchService.search(query).then((found) => {
        setResults(found)
        setSearching(false)
      })
    }, 200)
    return () => clearTimeout(timer)
  }, [query, open])

  // Escape closes the overlay.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSearch()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, closeSearch])

  if (!open) return null

  const grouped = SEARCH_GROUP_ORDER.map((group) => ({
    group,
    items: results.filter((r) => r.group === group),
  })).filter((g) => g.items.length > 0)

  const select = (item: SearchResultItem) => {
    addRecentSearch(query.trim())
    closeSearch()
    navigate(item.path)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="presentation">
      <div aria-hidden="true" className="animate-fade-in absolute inset-0 bg-gray-500/75" onClick={closeSearch} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        className="animate-modal-in relative w-full max-w-2xl overflow-hidden rounded-xl bg-card shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-tertiary" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search institutions, examinations, findings, returns, directives, reports…"
            aria-label="Search query"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-tertiary [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="cursor-pointer rounded p-1 text-ink-tertiary transition-colors hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <kbd className="hidden shrink-0 rounded border border-line bg-page px-1.5 py-0.5 font-mono text-[10px] text-ink-tertiary sm:block">
            Esc
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {query.trim().length < 2 && (
            <div className="px-3 py-4">
              {recentSearches.length > 0 ? (
                <>
                  <p className="overline flex items-center gap-1.5">
                    <Clock className="h-3 w-3" aria-hidden="true" /> Recent searches
                  </p>
                  <ul className="mt-2">
                    {recentSearches.map((recent) => (
                      <li key={recent}>
                        <button
                          type="button"
                          onClick={() => setQuery(recent)}
                          className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-page"
                        >
                          {recent}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-xs text-ink-secondary">
                  Type at least two characters. Try{' '}
                  <button type="button" className="cursor-pointer font-medium text-primary hover:underline" onClick={() => setQuery('Meridian')}>
                    Meridian
                  </button>
                  ,{' '}
                  <button type="button" className="cursor-pointer font-medium text-primary hover:underline" onClick={() => setQuery('liquidity')}>
                    liquidity
                  </button>{' '}
                  or{' '}
                  <button type="button" className="cursor-pointer font-medium text-primary hover:underline" onClick={() => setQuery('AML')}>
                    AML
                  </button>
                  . All results are fictional demo records.
                </p>
              )}
            </div>
          )}

          {searching && (
            <p className="px-4 py-6 text-center text-xs text-ink-secondary" role="status">
              Searching demo records…
            </p>
          )}

          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <SearchX className="mb-2 h-6 w-6 text-ink-tertiary" aria-hidden="true" />
              <p className="text-sm font-semibold text-ink">No demo records match “{query}”</p>
              <p className="mt-1 text-xs text-ink-secondary">
                Try an institution name (Meridian, Northstar, Unity, Crestline) or a reference like
                EXM-2026-014.
              </p>
            </div>
          )}

          {!searching &&
            grouped.map(({ group, items }) => {
              const Icon = groupIcons[group]
              return (
                <div key={group} className="mb-1">
                  <p className="overline flex items-center gap-1.5 px-3 pt-3 pb-1">
                    <Icon className="h-3 w-3" aria-hidden="true" /> {group}
                  </p>
                  <ul>
                    {items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => select(item)}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-tint-blue"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page text-primary">
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-ink">{item.title}</span>
                            <span className="block truncate text-[11px] text-ink-secondary">{item.subtitle}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
        </div>

        <div className="border-t border-line bg-page px-4 py-2 text-[10px] text-ink-tertiary">
          Demo search over fictional records — deep links to module screens land as those phases
          are built.
        </div>
      </div>
    </div>,
    document.body,
  )
}
