import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@/components/ui/Modal'

function Harness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          onClose()
        }}
        title="Test dialog"
        footer={<button type="button">Footer action</button>}
      >
        <p>Dialog body content.</p>
        <button type="button">Body action</button>
      </Modal>
    </div>
  )
}

describe('Modal', () => {
  it('moves focus into the dialog when opened', async () => {
    const user = userEvent.setup()
    render(<Harness onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))

    const dialog = screen.getByRole('dialog', { name: /test dialog/i })
    expect(dialog).toBeInTheDocument()
    // First focusable in the panel is the close button.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /close dialog/i }))
  })

  it('closes on Escape, calls onClose and restores focus to the trigger', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    expect(screen.getByRole('dialog', { name: /test dialog/i })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open dialog' }))
  })

  it('traps Tab focus inside the dialog', async () => {
    const user = userEvent.setup()
    render(<Harness onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))

    // Focus starts on the close button; tab through body action, footer action, then wrap.
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Body action' }))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Footer action' }))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /close dialog/i }))
  })
})
