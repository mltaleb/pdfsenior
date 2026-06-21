import { useState, useRef } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'
import { gatedDownload } from '../../lib/download'

export default function RotatePdf() {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [rotations, setRotations] = useState<number[]>([])
  const [processing, setProcessing] = useState(false)
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
      setRotations(new Array(count).fill(0))
    } catch {
      alert('Impossible de lire ce fichier PDF.')
    }
  }

  const rotatePage = (idx: number) => {
    setRotations(prev => {
      const next = [...prev]
      next[idx] = (next[idx] + 90) % 360
      return next
    })
  }

  const rotateAll = (angle: number) => {
    setRotations(prev => prev.map(r => (r + angle) % 360))
  }

  const apply = async () => {
    if (!file) return
    setProcessing(true)
    try {
      const doc = await PDFDocument.load(file.bytes, { ignoreEncryption: true })
      for (let i = 0; i < doc.getPageCount(); i++) {
        if (rotations[i] !== 0) {
          const page = doc.getPage(i)
          page.setRotation(degrees((page.getRotation().angle + rotations[i]) % 360))
        }
      }
      const out = await doc.save()
      await gatedDownload(out, file.name.replace('.pdf', '_pivote.pdf'))
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la rotation.')
    } finally {
      setProcessing(false)
    }
  }

  if (!file) {
    return (
      <div
        className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-cyan-300 hover:bg-cyan-50/50 transition-all"
        onClick={() => inputRef.current?.click()}
      >
        <svg className="w-12 h-12 text-cyan-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
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
        <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center">
          <span className="text-xs font-bold text-cyan-500">PDF</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">{file.name}</p>
          <p className="text-xs text-gray-400">{pageCount} page{pageCount > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setFile(null); setPageCount(0) }} className="text-xs text-gray-400 hover:text-red-500">Changer</button>
      </div>

      {/* Rotate all */}
      <div className="flex gap-3 justify-center">
        <button onClick={() => rotateAll(90)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.931 11H1l3.036-3.036A9 9 0 0121 12" /></svg>
          Tout pivoter 90
        </button>
        <button onClick={() => rotateAll(270)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.069 11H23l-3.036-3.036A9 9 0 003 12" /></svg>
          Tout pivoter -90
        </button>
      </div>

      {/* Page grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
        {Array.from({ length: pageCount }, (_, i) => (
          <button
            key={i}
            onClick={() => rotatePage(i)}
            className="group relative aspect-[3/4] rounded-lg border-2 border-gray-200 bg-white flex flex-col items-center justify-center hover:border-cyan-400 transition-all"
          >
            <div
              className="w-8 h-10 bg-gray-100 rounded flex items-center justify-center transition-transform duration-300"
              style={{ transform: `rotate(${rotations[i]}deg)` }}
            >
              <span className="text-[10px] font-bold text-gray-400">{i + 1}</span>
            </div>
            {rotations[i] !== 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">{rotations[i]}</span>
            )}
            <span className="text-[10px] text-gray-400 mt-1 group-hover:text-cyan-500">Cliquer</span>
          </button>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={apply}
          disabled={processing || rotations.every(r => r === 0)}
          className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-10 rounded-full shadow-md transition-all disabled:opacity-50"
        >
          {processing ? 'Application...' : 'Pivoter et telecharger'}
        </button>
      </div>
    </div>
  )
}
