/**
 * Prototype CSV export helper (Spec §5.2 "Export produces a prototype CSV").
 * Client-side only — nothing is sent anywhere; the download is clearly a
 * demo artefact.
 */
export function exportCsv(filename: string, header: string[], rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => {
    const s = String(value)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const content = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n')
  const blob = new Blob([`# Atheris Reg prototype export — fictional demo data\n${content}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
