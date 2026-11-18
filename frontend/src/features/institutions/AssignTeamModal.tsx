import { useEffect, useState } from 'react'
import { toast } from '@/components/feedback/toastStore'
import { Select } from '@/components/forms/FormControls'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { SupervisoryTeamOption } from '@/services/contracts/InstitutionService'
import { institutionService } from '@/services/mock/MockInstitutionService'
import type { Institution } from '@/types/institution'

/** Row-menu action: assign a supervisory team (Spec §5.4). Demo-only mutation. */
export function AssignTeamModal({
  open,
  institution,
  teams,
  onClose,
  onAssigned,
}: {
  open: boolean
  institution: Institution | null
  teams: SupervisoryTeamOption[]
  onClose: () => void
  onAssigned: () => void
}) {
  const [teamId, setTeamId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setTeamId(institution?.supervisory.teamId ?? '')
  }, [open, institution])

  const assign = async () => {
    if (!institution || !teamId) return
    setSaving(true)
    try {
      await institutionService.assignTeam(institution.id, teamId)
      toast.success(
        'Team assigned',
        `${teams.find((t) => t.id === teamId)?.name ?? 'Team'} is now responsible (saved in prototype session).`,
      )
      onAssigned()
      onClose()
    } catch (error) {
      toast.error('Assignment failed (demo)', error instanceof Error ? error.message : 'Unexpected error.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Assign supervisory team — ${institution?.tradingName ?? ''}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} disabled={!teamId} onClick={() => void assign()}>
            Assign team
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <Select
          label="Supervisory team"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          placeholder="Select a team…"
          options={teams.map((t) => ({ value: t.id, label: `${t.name} — ${t.department}` }))}
          help="Current team: institution records keep their lead supervisor; the team lead becomes responsible."
        />
        <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
          Demo action — assignment is saved in the prototype session only.
        </p>
      </div>
    </Modal>
  )
}
