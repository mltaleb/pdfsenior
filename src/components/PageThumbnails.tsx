import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $pdfBytes, $currentPage, $totalPages } from '../stores/app-store';

export default function PageThumbnails() {
  const pdfBytes = useStore($pdfBytes);
  const currentPage = useStore($currentPage);
  const totalPages = useStore($totalPages);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pdfBytes) return;

    const renderThumbnails = async () => {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      $totalPages.set(doc.numPages);

      const urls: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        urls.push(canvas.toDataURL());
      }
      setThumbnails(urls);
    };

    renderThumbnails();
  }, [pdfBytes]);

  if (!pdfBytes) return null;

  return (
    <div ref={containerRef} className="w-48 bg-white border-r border-gray-200 overflow-y-auto p-4 hidden md:flex flex-col gap-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
        Miniatures
      </p>
      {thumbnails.map((url, index) => (
        <button
          key={index}
          className={`relative rounded-lg overflow-hidden border-2 transition-all hover:shadow-md ${
            currentPage === index + 1
              ? 'border-primary-500 shadow-md'
              : 'border-transparent hover:border-gray-300'
          }`}
          onClick={() => $currentPage.set(index + 1)}
        >
          <img src={url} alt={`Page ${index + 1}`} className="w-full" />
          <div className={`absolute bottom-0 inset-x-0 text-center py-0.5 text-xs font-bold ${
            currentPage === index + 1
              ? 'bg-primary-500 text-white'
              : 'bg-gray-800/50 text-white'
          }`}>
            {index + 1}
          </div>
        </button>
      ))}

      {thumbnails.length === 0 && totalPages > 0 && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}
