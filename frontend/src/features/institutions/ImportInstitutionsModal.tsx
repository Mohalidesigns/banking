import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { toast } from '@/components/feedback/toastStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ProgressBar } from '@/components/ui/Progress'

/**
 * Mock institution import (Spec §5.4). The file is never uploaded or parsed
 * — the prototype simulates the flow and says so explicitly (Spec §1.1).
 */
export function ImportInstitutionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFileName(null)
    setProgress(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const startImport = () => {
    setProgress(10)
    const timer = window.setInterval(() => {
      setProgress((p) => {
        const next = (p ?? 0) + 30
        if (next >= 100) {
          window.clearInterval(timer)
          toast.info(
            'Demo import simulated',
            `"${fileName}" was received by the prototype. No file is uploaded, parsed or stored — demo action completed.`,
          )
          return 100
        }
        return next
      })
    }, 220)
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      size="sm"
      title="Import institutions (mock)"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            Close
          </Button>
          <Button variant="primary" disabled={!fileName || progress !== null} onClick={startImport}>
            Run demo import
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <label
          htmlFor="import-file"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-page px-6 py-8 text-center transition-colors hover:border-primary-surface"
        >
          <Upload className="h-6 w-6 text-ink-tertiary" aria-hidden="true" />
          <span className="text-xs font-medium text-ink">
            {fileName ?? 'Choose a CSV file to simulate an import'}
          </span>
          <span className="text-[10px] text-ink-secondary">
            The file stays in this dialog — the prototype never uploads or parses it.
          </span>
        </label>
        <input
          id="import-file"
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            setFileName(e.target.files?.[0]?.name ?? null)
            setProgress(null)
          }}
        />
        {progress !== null && (
          <div>
            <ProgressBar value={progress} label="Simulated import progress" showValue tone="primary" />
            {progress >= 100 && (
              <p className="mt-2 text-[11px] text-ink-secondary">
                Demo import completed — 0 records changed. This is a prototype simulation.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
