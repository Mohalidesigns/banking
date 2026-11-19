import { useNavigate } from 'react-router'
import { Lock } from 'lucide-react'
import { MAPPING_KIND_LABELS, type FrameworkMapping } from '@/types/regulatory'

/**
 * Cross-module reference chip (Spec §10, no-dead-ends rule). Mappings with a
 * `link` navigate to the real prototype page; Phase-5 targets (directives,
 * enforcement) render as labelled non-interactive chips — reference only,
 * never a broken link.
 */
export function RelationChip({
  mapping,
  onNavigate,
}: {
  mapping: FrameworkMapping
  onNavigate?: () => void
}) {
  const navigate = useNavigate()
  const kindLabel = MAPPING_KIND_LABELS[mapping.kind]
  const title = `${kindLabel}: ${mapping.targetLabel}${mapping.note ? ` — ${mapping.note}` : ''}`

  if (mapping.link) {
    const link = mapping.link
    return (
      <button
        type="button"
        title={title}
        className="cursor-pointer rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-surface transition-colors hover:bg-tint-blue"
        onClick={(e) => {
          e.stopPropagation()
          onNavigate?.()
          navigate(link)
        }}
      >
        {mapping.targetRef} →
      </button>
    )
  }

  return (
    <span
      title={title}
      className="inline-flex cursor-help items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-gray-600"
    >
      <Lock className="h-2.5 w-2.5" aria-hidden="true" />
      {mapping.targetRef}
    </span>
  )
}
