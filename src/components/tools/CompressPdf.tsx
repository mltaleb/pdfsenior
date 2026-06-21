import { useState, useRef } from 'react'
import { PDFDocument } from 'pdf-lib'
import { gatedDownload } from '../../lib/download'

export default function CompressPdf() {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [result, setResult] = useState<{ original: number; compressed: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadFile = async (f: File) => {
    if (f.type !== 'application/pdf') return
    const buf = await f.arrayBuffer()
    setFile({ name: f.name, bytes: new Uint8Array(buf) })
    setResult(null)
  }

  const compress = async () => {
    if (!file) return
    setCompressing(true)
    try {
      const doc = await PDFDocument.load(file.bytes, { ignoreEncryption: true })

      doc.setTitle('')
      doc.setAuthor('')
      doc.setSubject('')
      doc.setKeywords([])
      doc.setProducer('PDFSenior')
      doc.setCreator('PDFSenior')

      const out = await doc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: 100,
      })

      const original = file.bytes.length
      const compressed = out.length
      setResult({ original, compressed })

      await gatedDownload(out, file.name.replace('.pdf', '_compresse.pdf'))
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la compression.')
    } finally {
      setCompressing(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`
  }

  return (
    <div className="space-y-6">
      {!file ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-green-300 hover:bg-green-50/50 transition-all"
          onClick={() => inputRef.current?.click()}
        >
          <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-gray-700 font-medium mb-1">Selectionnez un fichier PDF</p>
          <p className="text-sm text-gray-400">Glissez-deposez ou cliquez</p>
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) loadFile(e.target.files[0]) }} />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-green-500">PDF</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">{file.name}</p>
              <p className="text-xs text-gray-400">{formatSize(file.bytes.length)}</p>
            </div>
            <button onClick={() => { setFile(null); setResult(null) }} className="text-xs text-gray-400 hover:text-red-500">Changer</button>
          </div>

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <p className="text-green-700 font-semibold mb-2">Compression terminee !</p>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="text-gray-500">{formatSize(result.original)}</span>
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                <span className="text-green-600 font-bold">{formatSize(result.compressed)}</span>
              </div>
              <p className="text-xs text-green-600 mt-2">
                {result.compressed < result.original
                  ? `Reduction de ${Math.round((1 - result.compressed / result.original) * 100)}%`
                  : 'Le fichier etait deja optimise'
                }
              </p>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={compress}
              disabled={compressing}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-10 rounded-full shadow-md transition-all disabled:opacity-50"
            >
              {compressing ? 'Compression...' : 'Compresser le PDF'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
