import { useState, useRef } from 'react'
import { PDFDocument } from 'pdf-lib'
import { gatedDownload } from '../../lib/download'

export default function MergePdf() {
  const [files, setFiles] = useState<{ name: string; bytes: Uint8Array }[]>([])
  const [merging, setMerging] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = async (fileList: FileList) => {
    const newFiles: { name: string; bytes: Uint8Array }[] = []
    for (const file of Array.from(fileList)) {
      if (file.type !== 'application/pdf') continue
      const buf = await file.arrayBuffer()
      newFiles.push({ name: file.name, bytes: new Uint8Array(buf) })
    }
    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const moveFile = (idx: number, dir: -1 | 1) => {
    setFiles(prev => {
      const arr = [...prev]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
  }

  const merge = async () => {
    if (files.length < 2) return
    setMerging(true)
    try {
      const merged = await PDFDocument.create()
      for (const f of files) {
        const src = await PDFDocument.load(f.bytes, { ignoreEncryption: true })
        const pages = await merged.copyPages(src, src.getPageIndices())
        pages.forEach(p => merged.addPage(p))
      }
      const out = await merged.save()
      gatedDownload(out, 'merged.pdf')
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la fusion. Veuillez reessayer.')
    } finally {
      setMerging(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          dragging ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-red-300 hover:bg-red-50/50'
        }`}
        onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files) }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
      >
        <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <p className="text-gray-700 font-medium mb-1">Deposez vos fichiers PDF ici</p>
        <p className="text-sm text-gray-400">ou cliquez pour selectionner</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-red-500">PDF</span>
              </div>
              <span className="flex-1 text-sm text-gray-700 truncate">{f.name}</span>
              <span className="text-xs text-gray-400">{(f.bytes.length / 1024).toFixed(0)} Ko</span>
              <div className="flex gap-1">
                <button onClick={() => moveFile(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30" title="Monter">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                </button>
                <button onClick={() => moveFile(i, 1)} disabled={i === files.length - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30" title="Descendre">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
                <button onClick={() => removeFile(i)} className="p-1 rounded hover:bg-red-50" title="Supprimer">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action */}
      {files.length >= 2 && (
        <div className="text-center">
          <button
            onClick={merge}
            disabled={merging}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-10 rounded-full shadow-md transition-all disabled:opacity-50"
          >
            {merging ? 'Fusion en cours...' : `Fusionner ${files.length} fichiers`}
          </button>
        </div>
      )}
    </div>
  )
}
