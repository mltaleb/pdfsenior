import { useState, useRef } from 'react'
import { PDFDocument } from 'pdf-lib'
import { gatedDownload } from '../../lib/download'

export default function JpgToPdf() {
  const [images, setImages] = useState<{ name: string; dataUrl: string; type: string }[]>([])
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addImages = async (fileList: FileList) => {
    const newImages: { name: string; dataUrl: string; type: string }[] = []
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('image/')) continue
      const dataUrl = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      newImages.push({ name: file.name, dataUrl, type: file.type })
    }
    setImages(prev => [...prev, ...newImages])
  }

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx))

  const moveImage = (idx: number, dir: -1 | 1) => {
    setImages(prev => {
      const arr = [...prev]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
  }

  const convert = async () => {
    if (images.length === 0) return
    setProcessing(true)
    try {
      const doc = await PDFDocument.create()

      for (const img of images) {
        const response = await fetch(img.dataUrl)
        const buf = await response.arrayBuffer()
        const bytes = new Uint8Array(buf)

        let embedded
        if (img.type === 'image/png') {
          embedded = await doc.embedPng(bytes)
        } else {
          embedded = await doc.embedJpg(bytes)
        }

        const { width, height } = embedded.scale(1)
        const page = doc.addPage([width, height])
        page.drawImage(embedded, { x: 0, y: 0, width, height })
      }

      const out = await doc.save()
      gatedDownload(out, 'images.pdf')
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la conversion.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-purple-300 hover:bg-purple-50/50 transition-all"
        onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) addImages(e.dataTransfer.files) }}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <svg className="w-12 h-12 text-purple-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
        <p className="text-gray-700 font-medium mb-1">Deposez vos images ici</p>
        <p className="text-sm text-gray-400">JPG, PNG acceptes</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files) addImages(e.target.files); e.target.value = '' }}
        />
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <div className="aspect-[3/4] rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
                <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
              </div>
              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">{i + 1}</span>
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {i > 0 && (
                  <button onClick={() => moveImage(i, -1)} className="w-5 h-5 bg-white rounded shadow flex items-center justify-center">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                )}
                <button onClick={() => removeImage(i)} className="w-5 h-5 bg-red-500 text-white rounded shadow flex items-center justify-center">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div className="text-center">
          <button
            onClick={convert}
            disabled={processing}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-10 rounded-full shadow-md transition-all disabled:opacity-50"
          >
            {processing ? 'Conversion...' : `Convertir ${images.length} image${images.length > 1 ? 's' : ''} en PDF`}
          </button>
        </div>
      )}
    </div>
  )
}
