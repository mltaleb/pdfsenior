import { useState, useRef } from 'react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { gatedDownload } from '../../lib/download'

export default function WatermarkPdf() {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null)
  const [text, setText] = useState('CONFIDENTIEL')
  const [opacity, setOpacity] = useState(0.15)
  const [fontSize, setFontSize] = useState(60)
  const [color, setColor] = useState('#888888')
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadFile = async (f: File) => {
    if (f.type !== 'application/pdf') return
    const buf = await f.arrayBuffer()
    setFile({ name: f.name, bytes: new Uint8Array(buf) })
  }

  const hexToRgbValues = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    return { r, g, b }
  }

  const apply = async () => {
    if (!file || !text.trim()) return
    setProcessing(true)
    try {
      const doc = await PDFDocument.load(file.bytes, { ignoreEncryption: true })
      const font = await doc.embedFont(StandardFonts.Helvetica)
      const { r, g, b } = hexToRgbValues(color)

      for (let i = 0; i < doc.getPageCount(); i++) {
        const page = doc.getPage(i)
        const { width, height } = page.getSize()
        const textWidth = font.widthOfTextAtSize(text, fontSize)
        const cx = width / 2 - textWidth / 2
        const cy = height / 2

        page.drawText(text, {
          x: cx,
          y: cy,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity,
          rotate: { type: 'degrees' as const, angle: -45 },
        })
      }

      const out = await doc.save()
      await gatedDownload(out, file.name.replace('.pdf', '_filigrane.pdf'))
    } catch (err) {
      console.error(err)
      alert('Erreur lors de l\'ajout du filigrane.')
    } finally {
      setProcessing(false)
    }
  }

  if (!file) {
    return (
      <div
        className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-pink-300 hover:bg-pink-50/50 transition-all"
        onClick={() => inputRef.current?.click()}
      >
        <svg className="w-12 h-12 text-pink-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
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
        <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center">
          <span className="text-xs font-bold text-pink-500">PDF</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">{file.name}</p>
        </div>
        <button onClick={() => setFile(null)} className="text-xs text-gray-400 hover:text-red-500">Changer</button>
      </div>

      {/* Watermark settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Texte du filigrane</label>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
            placeholder="Ex: CONFIDENTIEL, BROUILLON..."
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Taille</label>
            <select value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-pink-400">
              {[24, 36, 48, 60, 72, 96, 120].map(s => (
                <option key={s} value={s}>{s}pt</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Opacite</label>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              className="w-full mt-2 accent-pink-500"
            />
            <span className="text-xs text-gray-400">{Math.round(opacity * 100)}%</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Couleur</label>
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-100">
          <span
            style={{ fontSize: `${Math.min(fontSize / 2, 32)}px`, color, opacity, transform: 'rotate(-45deg)', display: 'inline-block' }}
            className="font-medium"
          >
            {text || 'Apercu'}
          </span>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={apply}
          disabled={processing || !text.trim()}
          className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-10 rounded-full shadow-md transition-all disabled:opacity-50"
        >
          {processing ? 'Application...' : 'Ajouter le filigrane'}
        </button>
      </div>
    </div>
  )
}
