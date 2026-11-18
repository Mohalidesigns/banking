import { BookOpen, CircleQuestionMark, Keyboard, Info } from 'lucide-react'
import { toast } from '@/components/feedback/toastStore'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu'

/** Help menu (Spec §3.3). Prototype-honest: no fake documentation claims. */
export function HelpMenu() {
  return (
    <DropdownMenu
      ariaLabel="Help"
      panelClassName="w-64"
      renderTrigger={({ triggerProps }) => (
        <button
          type="button"
          {...triggerProps}
          aria-label="Help"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-page hover:text-ink"
        >
          <CircleQuestionMark className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          <DropdownMenuItem
            icon={<BookOpen />}
            onSelect={() => {
              close()
              toast.info('User guide', 'Demo help — the full guide arrives with a later prototype phase.')
            }}
          >
            User guide
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<Keyboard />}
            onSelect={() => {
              close()
              toast.info('Keyboard shortcuts', 'Press ⌘K (or Ctrl+K) to open global search. Escape closes dialogs.')
            }}
          >
            Keyboard shortcuts
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<Info />}
            onSelect={() => {
              close()
              toast.info(
                'About this prototype',
                'Atheris Reg frontend prototype — fictional demo data only. No action here has regulatory effect.',
              )
            }}
          >
            About this prototype
          </DropdownMenuItem>
        </div>
      )}
    </DropdownMenu>
  )
}
