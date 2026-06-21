import { useRef, useState, useEffect } from 'react';

interface Props {
  onComplete: (dataUrl: string) => void;
  onClose: () => void;
}

export default function SignatureModal({ onComplete, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    const midY = canvas.height * 0.7;
    ctx.beginPath();
    ctx.moveTo(20, midY);
    ctx.lineTo(canvas.width - 20, midY);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    const midY = canvas.height * 0.7;
    ctx.beginPath();
    ctx.moveTo(20, midY);
    ctx.lineTo(canvas.width - 20, midY);
    ctx.stroke();
    ctx.setLineDash([]);
    setHasDrawn(false);
  };

  const confirm = () => {
    if (!hasDrawn) return;
    const dataUrl = canvasRef.current!.toDataURL('image/png');
    onComplete(dataUrl);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-4">Dessinez votre signature</h2>

        <div className="border-2 border-gray-200 rounded-xl overflow-hidden mb-4">
          <canvas
            ref={canvasRef}
            width={440}
            height={200}
            className="w-full cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={clear} className="flex-1 btn-outline">Effacer</button>
          <button onClick={confirm} disabled={!hasDrawn} className="flex-1 btn-primary disabled:opacity-50">
            Appliquer la signature
          </button>
        </div>
      </div>
    </div>
  );
}
