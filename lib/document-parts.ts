export const MAX_DOCUMENT_CHARS = 250_000
export type DocumentPart = { text: string; label: string; start: number; end: number }
/** Partition without dropping, reordering or silently truncating source characters. */
export function splitDocument(text: string): DocumentPart[] {
  if (text.length < 120 || text.length > MAX_DOCUMENT_CHARS) return []
  if (text.length <= 20_000) return [{ text, label: 'Cały materiał', start: 0, end: text.length }]
  const parts: DocumentPart[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + 12_000, text.length)
    if (end < text.length) {
      const boundary = text.lastIndexOf('\n', end)
      if (boundary >= start + 8000) end = boundary + 1
      if (text.slice(end).trim().length < 120 && text.length - start <= 20_000) end = text.length
    }
    const value = text.slice(start, end)
    const heading = value.split('\n').find(line => line.trim().length >= 8)?.trim().slice(0, 75) || 'Materiał źródłowy'
    parts.push({ text: value, label: `${parts.length + 1}. ${heading}`, start, end })
    start = end
  }
  return parts
}
