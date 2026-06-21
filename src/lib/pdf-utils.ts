import { PDFDocument, rgb } from 'pdf-lib';
import type { Annotation } from '../stores/app-store';
import { embedMatchingFont } from './font-utils';

export async function loadPdfFromFile(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function getPdfPageCount(pdfBytes: Uint8Array): Promise<number> {
  const safeBytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  const doc = await PDFDocument.load(safeBytes);
  return doc.getPageCount();
}

export async function applyAnnotationsAndExport(
  pdfBytes: Uint8Array,
  annotations: Annotation[]
): Promise<Uint8Array> {
  const safeBytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  const doc = await PDFDocument.load(safeBytes);

  for (const annotation of annotations) {
    if (annotation.page < 1 || annotation.page > doc.getPageCount()) continue;
    const page = doc.getPage(annotation.page - 1);
    const { height } = page.getSize();

    if (annotation.type === 'text') {
      const fontSize = annotation.fontSize || 16;
      const color = hexToRgb(annotation.color || '#000000');
      const font = await embedMatchingFont(
        doc,
        '',
        annotation.fontFamily || 'sans-serif',
        annotation.bold || false,
        annotation.italic || false,
      );
      page.drawText(annotation.content, {
        x: annotation.x,
        y: height - annotation.y - fontSize,
        size: fontSize,
        font,
        color: rgb(color.r / 255, color.g / 255, color.b / 255),
      });
    }
  }

  return doc.save();
}

export async function exportPdfAsImages(
  pdfBytes: Uint8Array,
  format: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<Blob[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const safeBytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  const doc = await pdfjsLib.getDocument({ data: safeBytes }).promise;
  const blobs: Blob[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), format, 0.95);
    });
    blobs.push(blob);
  }

  return blobs;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}
