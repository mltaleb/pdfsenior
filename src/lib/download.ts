import { $isPaid } from '../stores/app-store'

export function gatedDownload(data: Uint8Array | Blob, fileName: string): boolean {
  if (!$isPaid.get()) {
    window.location.href = '/pricing'
    return false
  }

  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
  return true
}
