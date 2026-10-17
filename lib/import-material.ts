import { MAX_DOCUMENT_CHARS } from './document-parts.ts'
class MaterialImportError extends Error {}

export async function importMaterial(file: File): Promise<string> {
  try { return await extractMaterial(file) }
  catch (error) {
    if (error instanceof MaterialImportError) throw error
    throw new MaterialImportError('Nie można odczytać dokumentu. Sprawdź, czy plik jest poprawny i nie jest zaszyfrowany, albo wklej jego tekst.')
  }
}
async function extractMaterial(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new MaterialImportError('Plik może mieć najwyżej 10 MB.')
  const extension = file.name.split('.').pop()?.toLowerCase()
  let result = ''
  if (['txt', 'md', 'markdown'].includes(extension || '')) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8'
    try { result = new TextDecoder(encoding, { fatal: true }).decode(bytes) }
    catch { throw new MaterialImportError('Nie można odczytać kodowania. Zapisz plik jako tekst UTF-8.') }
  } else if (extension === 'docx') {
    const mammoth = await import('mammoth')
    result = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value
  } else if (extension === 'pdf') {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableFontFace: true, useSystemFonts: false })
    try {
      const doc = await task.promise
      if (doc.numPages > 150) throw new MaterialImportError('PDF może mieć najwyżej 150 stron. Podziel większy plik.')
      const pages: string[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i), content = await page.getTextContent()
        pages.push(content.items.map(item => 'str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : '').join('').trim())
        if (pages.join('\n\n').length > MAX_DOCUMENT_CHARS) throw new MaterialImportError('Dokument przekracza 250 000 znaków. Podziel większy plik.')
      }
      result = pages.join('\n\n')
    } finally { await task.destroy() }
    if (result.trim().length < 120) throw new MaterialImportError('PDF nie zawiera wystarczającej ilości tekstu. Jeśli to skan, użyj OCR lub wklej rozpoznany tekst.')
  } else throw new MaterialImportError('Wybierz plik TXT, Markdown, DOCX lub PDF z tekstem.')
  result = result.replace(/\r\n?/g, '\n').trim()
  if (result.length > MAX_DOCUMENT_CHARS) throw new MaterialImportError('Dokument przekracza 250 000 znaków. Podziel większy plik.')
  if (result.length < 120) throw new MaterialImportError('Materiał musi zawierać co najmniej 120 znaków tekstu.')
  return result
}
