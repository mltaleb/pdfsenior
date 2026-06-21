import { useState, useRef } from 'react'
import { PDFDocument } from 'pdf-lib'
import { gatedDownload } from '../../lib/download'

export default function SplitPdf() {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [splitting, setSplitting] = useState(false)
  const [mode, setMode] = useState<'extract' | 'each'>('extract')
  const inputRef = useRef<HTMLInputElement>(null)

  const loadFile = async (f: File) => {
    if (f.type !== 'application/pdf') return
    const buf = await f.arrayBuffer()
    const bytes = new Uint8Array(buf)
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
      const count = doc.getPageCount()
      setFile({ name: f.name, bytes })
      setPageCount(count)
      setSelectedPages(new Set(Array.from({ length: count }, (_, i) => i)))
    } catch {
      alert('Impossible de lire ce fichier PDF.')
    }
  }

  const togglePage = (idx: number) => {
    setSelectedPages(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const selectAll = () => setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i)))
  const selectNone = () => setSelectedPages(new Set())

  const split = async () => {
    if (!file) return
    setSplitting(true)
    try {
      const src = await PDFDocument.load(file.bytes, { ignoreEncryption: true })
      if (mode === 'each') {
        for (let i = 0; i < src.getPageCount(); i++) {
          const doc = await PDFDocument.create()
          const [page] = await doc.copyPages(src, [i])
          doc.addPage(page)
          gatedDownload(await doc.save(), `${file.name.replace('.pdf', '')}_page${i + 1}.pdf`)
        }
      } else {
        const pages = Array.from(selectedPages).sort((a, b) => a - b)
        if (pages.length === 0) { setSplitting(false); return }
        const doc = await PDFDocument.create()
        const copied = await doc.copyPages(src, pages)
        copied.forEach(p => doc.addPage(p))
        gatedDownload(await doc.save(), `${file.name.replace('.pdf', '')}_extrait.pdf`)
      }
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la division.')
    } finally {
      setSplitting(false)
    }
  }

  if (!file) {
    return (
      <div
        className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all"
        onClick={() => inputRef.current?.click()}
      >
        <svg className="w-12 h-12 text-blue-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-gray-700 font-medium mb-1">Selectionnez un fichier PDF</p>
        <p className="text-sm text-gray-400">Glissez-deposez ou cliquez</p>
        <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) loadFile(e.target.files[0]) }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
          <span className="text-xs font-bold text-blue-500">PDF</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">{file.name}</p>
          <p className="text-xs text-gray-400">{pageCount} page{pageCount > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setFile(null); setPageCount(0); setSelectedPages(new Set()) }} className="text-xs text-gray-400 hover:text-red-500">Changer</button>
      </div>

      {/* Mode selection */}
      <div className="flex gap-3">
        <button
          onClick={() => setMode('extract')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${mode === 'extract' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Extraire les pages
        </button>
        <button
          onClick={() => setMode('each')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${mode === 'each' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          1 PDF par page
        </button>
      </div>

      {/* Page grid for extract mode */}
      {mode === 'extract' && (
        <>
          <div className="flex gap-2 items-center">
            <button onClick={selectAll} className="text-xs text-blue-500 hover:underline">Tout selectionner</button>
            <span className="text-gray-300">|</span>
            <button onClick={selectNone} className="text-xs text-blue-500 hover:underline">Aucune</button>
            <span className="flex-1" />
            <span className="text-xs text-gray-400">{selectedPages.size} / {pageCount} selectionnee{selectedPages.size > 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                onClick={() => togglePage(i)}
                className={`aspect-[3/4] rounded-lg border-2 flex items-center justify-center text-sm font-semibold transition-all ${
                  selectedPages.has(i) ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="text-center">
        <button
          onClick={split}
          disabled={splitting || (mode === 'extract' && selectedPages.size === 0)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-10 rounded-full shadow-md transition-all disabled:opacity-50"
        >
          {splitting ? 'Division en cours...' : mode === 'each' ? `Diviser en ${pageCount} fichiers` : `Extraire ${selectedPages.size} page${selectedPages.size > 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}
