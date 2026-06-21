import { useEffect, useRef, useState, useCallback } from "react"
import { useStore } from "@nanostores/react"
import {
  $pdfBytes,
  $currentPage,
  $totalPages,
  $activeTool,
  $drawColor,
  $fontSize,
  $fontFamily,
  $fontBold,
  $fontItalic,
  $annotations,
  $fileName,
  $showSignModal,
  addAnnotation,
  removeAnnotation,
  selectAnnotation,
  updateAnnotation,
  type Annotation,
} from "../stores/app-store"
import { loadFile } from "../lib/file-storage"
import SignatureModal from "./SignatureModal"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"

export default function PdfEditor() {
  const pdfBytes = useStore($pdfBytes)
  const currentPage = useStore($currentPage)
  const activeTool = useStore($activeTool)
  const drawColor = useStore($drawColor)
  const fontSize = useStore($fontSize)
  const fontFamily = useStore($fontFamily)
  const fontBold = useStore($fontBold)
  const fontItalic = useStore($fontItalic)
  const annotations = useStore($annotations)
  const showSignModal = useStore($showSignModal)

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1.5)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lineWidth, setLineWidth] = useState(2)
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(
    null,
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [editPos, setEditPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })
  const [editFontSize, setEditFontSize] = useState(16)
  const [dragState, setDragState] = useState<{
    id: string
    offsetX: number
    offsetY: number
  } | null>(null)
  const [canvasDims, setCanvasDims] = useState({ w: 0, h: 0 })
  const drawPathRef = useRef<{ x: number; y: number }[]>([])


  useEffect(() => {
    if (!pdfBytes) {
      loadFile().then(data => {
        if (data) {
          $pdfBytes.set(new Uint8Array(data.bytes))
          $fileName.set(data.fileName)
        }
      })
    }
  }, [])


  useEffect(() => {
    const handler = (e: Event) => setLineWidth((e as CustomEvent).detail)
    window.addEventListener("editor-line-width", handler)
    return () => window.removeEventListener("editor-line-width", handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      addAnnotation({
        id: crypto.randomUUID(),
        type: "image",
        page: currentPage,
        x: 100,
        y: 100,
        content: (e as CustomEvent).detail as string,
        width: 200,
        height: 150,
      })
    }
    window.addEventListener("editor-insert-image", handler)
    return () => window.removeEventListener("editor-insert-image", handler)
  }, [currentPage])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingId) return
      if (e.key === "Delete" || e.key === "Backspace") {
        const selected = annotations.find(a => a.selected)
        if (selected) removeAnnotation(selected.id)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [annotations, editingId])

  useEffect(() => {
    if (!pdfBytes || !pdfCanvasRef.current) return
    const renderPage = async () => {
      const pdfjsLib = await import("pdfjs-dist")
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
      const data = new Uint8Array(pdfBytes)
      const doc = await pdfjsLib.getDocument({ data }).promise
      $totalPages.set(doc.numPages)
      if (currentPage < 1 || currentPage > doc.numPages) return

      const page = await doc.getPage(currentPage)
      const viewport = page.getViewport({ scale })
      const canvas = pdfCanvasRef.current!
      canvas.width = viewport.width
      canvas.height = viewport.height
      setCanvasDims({ w: viewport.width, h: viewport.height })

      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = viewport.width
        overlayCanvasRef.current.height = viewport.height
      }

      await page.render({ canvasContext: canvas.getContext("2d")!, viewport })
        .promise

      // Render native pdfjs text layer for pixel-perfect positioning
      const tlContainer = textLayerRef.current
      if (tlContainer) {
        tlContainer.innerHTML = ""
        tlContainer.className = "textLayer"
        const tc = await page.getTextContent()
        const tl = new pdfjsLib.TextLayer({
          textContentSource: tc,
          container: tlContainer,
          viewport,
        })
        await tl.render()
      }

      redrawAnnotations()
    }
    renderPage()
  }, [pdfBytes, currentPage, scale])




  // Draw annotations overlay
  const redrawAnnotations = useCallback(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const pageAnnotations = annotations.filter(a => a.page === currentPage)
    for (const ann of pageAnnotations) {
      const sx = scale
      if (ann.type === "text" || ann.type === "note") {
        const fs = (ann.fontSize || 16) * sx
        const wt = ann.bold ? "bold" : "normal"
        const st = ann.italic ? "italic" : "normal"
        ctx.font = `${st} ${wt} ${fs}px ${ann.fontFamily || "sans-serif"}, sans-serif`
        ctx.fillStyle = ann.color || "#000000"
        ctx.fillText(ann.content, ann.x * sx, ann.y * sx)
        if (ann.selected) {
          const m = ctx.measureText(ann.content)
          ctx.strokeStyle = "#3B82F6"
          ctx.lineWidth = 1
          ctx.setLineDash([4, 4])
          ctx.strokeRect(ann.x * sx - 4, ann.y * sx - fs, m.width + 8, fs + 8)
          ctx.setLineDash([])
        }
      } else if (ann.type === "drawing" && ann.content) {
        try {
          const pts = JSON.parse(ann.content) as { x: number; y: number }[]
          if (pts.length < 2) continue
          ctx.beginPath()
          ctx.strokeStyle = ann.color || "#000000"
          ctx.lineWidth = (ann.lineWidth || 2) * sx
          ctx.lineCap = "round"
          ctx.lineJoin = "round"
          ctx.moveTo(pts[0].x * sx, pts[0].y * sx)
          for (let i = 1; i < pts.length; i++)
            ctx.lineTo(pts[i].x * sx, pts[i].y * sx)
          ctx.stroke()
        } catch {}
      } else if (ann.type === "line") {
        ctx.beginPath()
        ctx.strokeStyle = ann.color || "#000000"
        ctx.lineWidth = (ann.lineWidth || 2) * sx
        ctx.lineCap = "round"
        ctx.moveTo(ann.x * sx, ann.y * sx)
        ctx.lineTo((ann.endX || ann.x) * sx, (ann.endY || ann.y) * sx)
        ctx.stroke()
      } else if (ann.type === "highlight") {
        try {
          const pts = JSON.parse(ann.content) as { x: number; y: number }[]
          if (pts.length < 2) continue
          ctx.beginPath()
          ctx.strokeStyle = (ann.color || "#FFFF00") + "80"
          ctx.lineWidth = 20 * sx
          ctx.lineCap = "round"
          ctx.lineJoin = "round"
          ctx.moveTo(pts[0].x * sx, pts[0].y * sx)
          for (let i = 1; i < pts.length; i++)
            ctx.lineTo(pts[i].x * sx, pts[i].y * sx)
          ctx.stroke()
        } catch {}
      } else if (
        (ann.type === "image" || ann.type === "signature") &&
        ann.content
      ) {
        const img = new Image()
        img.onload = () => {
          const w = (ann.width || 200) * sx
          const h = (ann.height || (ann.type === "signature" ? 80 : 150)) * sx
          ctx.drawImage(img, ann.x * sx, ann.y * sx, w, h)
          if (ann.selected) {
            ctx.strokeStyle = "#3B82F6"
            ctx.lineWidth = 2
            ctx.setLineDash([4, 4])
            ctx.strokeRect(ann.x * sx - 2, ann.y * sx - 2, w + 4, h + 4)
            ctx.setLineDash([])
          }
        }
        img.src = ann.content
      }
    }
  }, [annotations, currentPage, scale])

  useEffect(() => {
    redrawAnnotations()
  }, [redrawAnnotations])

  const getCoords = (e: React.MouseEvent) => {
    const rect = overlayCanvasRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    }
  }

  const findAnnotationAt = (x: number, y: number): Annotation | null => {
    const pa = annotations.filter(a => a.page === currentPage)
    for (let i = pa.length - 1; i >= 0; i--) {
      const a = pa[i]
      if (a.type === "text" || a.type === "note") {
        const fs = a.fontSize || 16
        const aw = a.content.length * fs * 0.55
        if (
          x >= a.x - 5 &&
          x <= a.x + aw + 5 &&
          y >= a.y - fs - 5 &&
          y <= a.y + 5
        )
          return a
      } else if (a.type === "image" || a.type === "signature") {
        const w = a.width || 200,
          h = a.height || 150
        if (x >= a.x && x <= a.x + w && y >= a.y && y <= a.y + h) return a
      } else if (a.type === "drawing" && a.content) {
        try {
          for (const p of JSON.parse(a.content))
            if (Math.abs(x - p.x) < 10 && Math.abs(y - p.y) < 10) return a
        } catch {}
      } else if (a.type === "line") {
        const A = x - a.x,
          B = y - a.y,
          C = (a.endX || a.x) - a.x,
          D = (a.endY || a.y) - a.y
        const dot = A * C + B * D,
          ls = C * C + D * D
        let t = ls ? dot / ls : -1
        t = Math.max(0, Math.min(1, t))
        if (Math.sqrt((x - a.x - t * C) ** 2 + (y - a.y - t * D) ** 2) < 10)
          return a
      }
    }
    return null
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCoords(e)
    if (activeTool === "select") {
      const ann = findAnnotationAt(x, y)
      if (ann) {
        selectAnnotation(ann.id)
        setDragState({ id: ann.id, offsetX: x - ann.x, offsetY: y - ann.y })
      } else selectAnnotation(null)
    } else if (activeTool === "text" || activeTool === "note") {
      setEditingId("new")
      setEditText("")
      setEditPos({ x, y })
      setEditFontSize(fontSize)
    } else if (activeTool === "draw" || activeTool === "highlight") {
      setIsDrawing(true)
      drawPathRef.current = [{ x, y }]
    } else if (activeTool === "sign") {
      $showSignModal.set(true)
    } else if (activeTool === "line") {
      setLineStart({ x, y })
      setIsDrawing(true)
    } else if (activeTool === "erase") {
      const ann = findAnnotationAt(x, y)
      if (ann) removeAnnotation(ann.id)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCoords(e)
    if (dragState) {
      updateAnnotation(dragState.id, {
        x: x - dragState.offsetX,
        y: y - dragState.offsetY,
      })
      return
    }
    if (!isDrawing) return
    if (activeTool === "line" && lineStart) {
      redrawAnnotations()
      const ctx = overlayCanvasRef.current!.getContext("2d")!
      ctx.beginPath()
      ctx.strokeStyle = drawColor
      ctx.lineWidth = lineWidth * scale
      ctx.lineCap = "round"
      ctx.moveTo(lineStart.x * scale, lineStart.y * scale)
      ctx.lineTo(x * scale, y * scale)
      ctx.stroke()
      return
    }
    if (activeTool === "draw" || activeTool === "highlight") {
      drawPathRef.current.push({ x, y })
      const ctx = overlayCanvasRef.current!.getContext("2d")!
      const p = drawPathRef.current
      if (p.length < 2) return
      const f = p[p.length - 2],
        t = p[p.length - 1]
      ctx.beginPath()
      if (activeTool === "highlight") {
        ctx.strokeStyle =
          (drawColor === "#000000" ? "#FFFF00" : drawColor) + "80"
        ctx.lineWidth = 20 * scale
      } else {
        ctx.strokeStyle = drawColor
        ctx.lineWidth = lineWidth * scale
      }
      ctx.lineCap = "round"
      ctx.moveTo(f.x * scale, f.y * scale)
      ctx.lineTo(t.x * scale, t.y * scale)
      ctx.stroke()
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragState) {
      setDragState(null)
      return
    }
    if (!isDrawing) return
    setIsDrawing(false)
    const c = (e as any).clientX != null ? getCoords(e) : { x: 0, y: 0 }
    if (activeTool === "line" && lineStart) {
      addAnnotation({
        id: crypto.randomUUID(),
        type: "line",
        page: currentPage,
        x: lineStart.x,
        y: lineStart.y,
        endX: c.x,
        endY: c.y,
        content: "",
        color: drawColor,
        lineWidth,
      })
      setLineStart(null)
    } else if (activeTool === "draw" || activeTool === "highlight") {
      if (drawPathRef.current.length > 1)
        addAnnotation({
          id: crypto.randomUUID(),
          type: activeTool === "highlight" ? "highlight" : "drawing",
          page: currentPage,
          x: 0,
          y: 0,
          content: JSON.stringify(drawPathRef.current),
          color:
            activeTool === "highlight"
              ? drawColor === "#000000"
                ? "#FFFF00"
                : drawColor
              : drawColor,
          lineWidth,
        })
      drawPathRef.current = []
    }
  }

  const handleTextSubmit = () => {
    if (!editText.trim()) {
      setEditingId(null)
      return
    }
    if (editingId === "new") {
      addAnnotation({
        id: crypto.randomUUID(),
        type: activeTool === "note" ? "note" : "text",
        page: currentPage,
        x: editPos.x,
        y: editPos.y,
        content: editText,
        color: drawColor,
        fontSize,
        fontFamily,
        bold: fontBold,
        italic: fontItalic,
      })
    } else if (editingId) {
      updateAnnotation(editingId, { content: editText })
    }
    setEditingId(null)
    setEditText("")
  }

  const handleSignatureComplete = (dataUrl: string) => {
    addAnnotation({
      id: crypto.randomUUID(),
      type: "signature",
      page: currentPage,
      x: 100,
      y: 300,
      content: dataUrl,
      width: 200,
      height: 80,
    })
    $showSignModal.set(false)
  }

  const totalPages = useStore($totalPages)
  const getCursor = () => {
    switch (activeTool) {
      case "text":
      case "note":
        return "text"
      case "draw":
      case "sign":
      case "line":
        return "crosshair"
      case "highlight":
        return "cell"
      case "erase":
        return "pointer"
      default:
        return "default"
    }
  }

  const isTextLayerActive = activeTool === "select"

  if (!pdfBytes) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#E5E7EB]">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Aucun document charge
          </h3>
          <p className="text-gray-500 mb-4">
            Telechargez un PDF pour commencer l'edition
          </p>
          <a href="/" className="btn-primary inline-block">
            Telecharger un fichier
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#E5E7EB] overflow-hidden relative">
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-12 flex justify-center"
      >
        <div
          className="relative shadow-2xl"
          style={{
            width: canvasDims.w || "auto",
            height: canvasDims.h || "auto",
          }}
        >
          <canvas ref={pdfCanvasRef} className="block" />

          {/* Native pdfjs text layer for pixel-perfect text positioning */}
          <div
            ref={textLayerRef}
            className="absolute inset-0"
            style={{ zIndex: 5 }}
          />

          {/* Drawing overlay */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0"
            style={{
              cursor: getCursor(),
              pointerEvents: isTextLayerActive ? "none" : "auto",
              zIndex: isTextLayerActive ? 5 : 10,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (isDrawing) handleMouseUp({} as any)
              if (dragState) setDragState(null)
            }}
          />

          {/* Popup for new text / editing annotation text */}
          {editingId && (
            <div
              className="absolute z-30"
              style={{
                left: editPos.x * scale,
                top: (editPos.y - editFontSize) * scale,
              }}
            >
              <div className="flex gap-1 bg-white shadow-lg rounded-lg p-1.5 border border-gray-200">
                <input
                  type="text"
                  autoFocus
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleTextSubmit()
                    if (e.key === "Escape") {
                      setEditingId(null)
                      setEditText("")
                    }
                  }}
                  placeholder="Tapez votre texte..."
                  className="px-3 py-1.5 text-sm border-0 outline-none min-w-[250px]"
                  style={{
                    fontSize: `${editFontSize}px`,
                    color: drawColor,
                    fontFamily,
                    fontWeight: fontBold ? "bold" : "normal",
                    fontStyle: fontItalic ? "italic" : "normal",
                  }}
                />
                <button
                  onClick={handleTextSubmit}
                  className="px-3 py-1 bg-primary-500 text-white text-xs rounded-md hover:bg-primary-600"
                >
                  OK
                </button>
                <button
                  onClick={() => {
                    setEditingId(null)
                    setEditText("")
                  }}
                  className="px-2 py-1 text-gray-500 text-xs hover:bg-gray-100 rounded-md"
                >
                  &times;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating bottom pill bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#374151]/90 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center gap-4 shadow-xl z-50">
        <div className="flex items-center gap-2 border-r border-gray-500 pr-4">
          <button
            onClick={() => $currentPage.set(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium min-w-[90px] text-center">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => $currentPage.set(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-sm font-mono w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.25))}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {showSignModal && (
        <SignatureModal
          onComplete={handleSignatureComplete}
          onClose={() => $showSignModal.set(false)}
        />
      )}
    </div>
  )
}
