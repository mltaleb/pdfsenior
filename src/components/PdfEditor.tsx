import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import {
  $pdfBytes, $currentPage, $totalPages, $activeTool,
  $drawColor, $fontSize, $annotations, $fileName, addAnnotation,
  type EditorTool, type Annotation
} from '../stores/app-store';
import { loadFile } from '../lib/file-storage';

export default function PdfEditor() {
  const pdfBytes = useStore($pdfBytes);

  // Restore file from IndexedDB on mount
  useEffect(() => {
    if (!pdfBytes) {
      loadFile().then((data) => {
        if (data) {
          $pdfBytes.set(data.bytes);
          $fileName.set(data.fileName);
        }
      });
    }
  }, []);
  const currentPage = useStore($currentPage);
  const activeTool = useStore($activeTool);
  const drawColor = useStore($drawColor);
  const fontSize = useStore($fontSize);
  const annotations = useStore($annotations);

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [textValue, setTextValue] = useState('');
  const drawPathRef = useRef<{ x: number; y: number }[]>([]);

  // Render PDF page
  useEffect(() => {
    if (!pdfBytes || !pdfCanvasRef.current) return;

    const renderPage = async () => {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      $totalPages.set(doc.numPages);

      if (currentPage < 1 || currentPage > doc.numPages) return;

      const page = await doc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = pdfCanvasRef.current!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Size overlay to match
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = viewport.width;
        overlayCanvasRef.current.height = viewport.height;
      }

      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      // Re-draw annotations for this page
      redrawAnnotations();
    };

    renderPage();
  }, [pdfBytes, currentPage, scale]);

  // Redraw annotations on overlay canvas
  const redrawAnnotations = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pageAnnotations = annotations.filter(a => a.page === currentPage);
    for (const ann of pageAnnotations) {
      if (ann.type === 'text') {
        ctx.font = `${(ann.fontSize || 16) * scale}px Inter, sans-serif`;
        ctx.fillStyle = ann.color || '#000000';
        ctx.fillText(ann.content, ann.x * scale, ann.y * scale);
      } else if (ann.type === 'drawing' && ann.content) {
        const points = JSON.parse(ann.content) as { x: number; y: number }[];
        if (points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = ann.color || '#000000';
        ctx.lineWidth = 2 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(points[0].x * scale, points[0].y * scale);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x * scale, points[i].y * scale);
        }
        ctx.stroke();
      }
    }
  }, [annotations, currentPage, scale]);

  useEffect(() => {
    redrawAnnotations();
  }, [redrawAnnotations]);

  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = overlayCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'text') {
      setTextInput({ x, y, visible: true });
      setTextValue('');
    } else if (activeTool === 'draw' || activeTool === 'sign') {
      setIsDrawing(true);
      drawPathRef.current = [{ x, y }];
    } else if (activeTool === 'highlight') {
      setIsDrawing(true);
      drawPathRef.current = [{ x, y }];
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasCoords(e);
    drawPathRef.current.push({ x, y });

    // Draw live on overlay
    const canvas = overlayCanvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const path = drawPathRef.current;
    if (path.length < 2) return;

    const from = path[path.length - 2];
    const to = path[path.length - 1];
    ctx.beginPath();

    if (activeTool === 'highlight') {
      ctx.strokeStyle = drawColor + '60';
      ctx.lineWidth = 20 * scale;
    } else {
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = 2 * scale;
    }
    ctx.lineCap = 'round';
    ctx.moveTo(from.x * scale, from.y * scale);
    ctx.lineTo(to.x * scale, to.y * scale);
    ctx.stroke();
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (drawPathRef.current.length > 1) {
      addAnnotation({
        id: crypto.randomUUID(),
        type: 'drawing',
        page: currentPage,
        x: 0,
        y: 0,
        content: JSON.stringify(drawPathRef.current),
        color: activeTool === 'highlight' ? drawColor + '60' : drawColor,
      });
    }
    drawPathRef.current = [];
  };

  const handleTextSubmit = () => {
    if (textValue.trim()) {
      addAnnotation({
        id: crypto.randomUUID(),
        type: 'text',
        page: currentPage,
        x: textInput.x,
        y: textInput.y,
        content: textValue,
        color: drawColor,
        fontSize: fontSize,
      });
    }
    setTextInput({ x: 0, y: 0, visible: false });
    setTextValue('');
  };

  // Page navigation
  const totalPages = useStore($totalPages);
  const goToPrevPage = () => $currentPage.set(Math.max(1, currentPage - 1));
  const goToNextPage = () => $currentPage.set(Math.min(totalPages, currentPage + 1));

  if (!pdfBytes) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun document chargé</h3>
          <p className="text-gray-500 mb-4">Téléchargez un PDF pour commencer l'édition</p>
          <a href="/" className="btn-primary inline-block">Télécharger un fichier</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
      {/* Page controls */}
      <div className="flex items-center justify-center gap-4 py-2 bg-gray-50 border-b border-gray-200">
        <button
          onClick={goToPrevPage}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-sm font-medium text-gray-700">
          Page {currentPage} / {totalPages}
        </span>

        <button
          onClick={goToNextPage}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Zoom controls */}
        <button
          onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          title="Zoom arrière"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
        <span className="text-sm text-gray-600 w-12 text-center">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale(s => Math.min(3, s + 0.25))}
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          title="Zoom avant"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 overflow-auto p-8 flex justify-center">
        <div className="relative shadow-2xl">
          <canvas ref={pdfCanvasRef} className="block" />
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0"
            style={{ cursor: activeTool === 'text' ? 'text' : activeTool === 'draw' || activeTool === 'sign' ? 'crosshair' : activeTool === 'highlight' ? 'cell' : 'default' }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />

          {/* Text input overlay */}
          {textInput.visible && (
            <div
              className="absolute z-10"
              style={{
                left: textInput.x * scale,
                top: textInput.y * scale,
              }}
            >
              <div className="flex gap-1 bg-white shadow-lg rounded-lg p-1 border border-gray-200">
                <input
                  type="text"
                  autoFocus
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                  placeholder="Tapez votre texte..."
                  className="px-3 py-2 text-sm border-0 outline-none min-w-[200px]"
                  style={{ fontSize: `${fontSize}px`, color: drawColor }}
                />
                <button
                  onClick={handleTextSubmit}
                  className="px-3 py-1 bg-primary-500 text-white text-sm rounded-md hover:bg-primary-600"
                >
                  OK
                </button>
                <button
                  onClick={() => setTextInput({ x: 0, y: 0, visible: false })}
                  className="px-2 py-1 text-gray-500 text-sm hover:bg-gray-100 rounded-md"
                >
                  &times;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
