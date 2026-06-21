import { PDFDocument, rgb, PDFImage } from 'pdf-lib';
import type { Annotation } from '../stores/app-store';
import { embedMatchingFont } from './font-utils';

export async function loadPdfFromFile(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function getPdfPageCount(pdfBytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(new Uint8Array(pdfBytes));
  return doc.getPageCount();
}

export async function applyAnnotationsAndExport(
  pdfBytes: Uint8Array,
  annotations: Annotation[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(new Uint8Array(pdfBytes));

  for (const annotation of annotations) {
    if (annotation.page < 1 || annotation.page > doc.getPageCount()) continue;
    const page = doc.getPage(annotation.page - 1);
    const { height } = page.getSize();

    if (annotation.type === 'text' || annotation.type === 'note') {
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
    } else if (annotation.type === 'drawing' && annotation.content) {
      try {
        const points: { x: number; y: number }[] = JSON.parse(annotation.content);
        if (points.length < 2) continue;
        const color = hexToRgb(annotation.color || '#000000');
        const lw = annotation.lineWidth || 2;

        for (let i = 1; i < points.length; i++) {
          page.drawLine({
            start: { x: points[i - 1].x, y: height - points[i - 1].y },
            end: { x: points[i].x, y: height - points[i].y },
            thickness: lw,
            color: rgb(color.r / 255, color.g / 255, color.b / 255),
          });
        }
      } catch {}
    } else if (annotation.type === 'line') {
      const color = hexToRgb(annotation.color || '#000000');
      page.drawLine({
        start: { x: annotation.x, y: height - annotation.y },
        end: { x: annotation.endX || annotation.x, y: height - (annotation.endY || annotation.y) },
        thickness: annotation.lineWidth || 2,
        color: rgb(color.r / 255, color.g / 255, color.b / 255),
      });
    } else if (annotation.type === 'highlight') {
      const color = hexToRgb(annotation.color || '#FFFF00');
      const w = annotation.width || 100;
      const h = annotation.height || 20;
      page.drawRectangle({
        x: annotation.x,
        y: height - annotation.y - h,
        width: w,
        height: h,
        color: rgb(color.r / 255, color.g / 255, color.b / 255),
        opacity: 0.35,
      });
    } else if ((annotation.type === 'signature' || annotation.type === 'image') && annotation.content) {
      try {
        const dataUrl = annotation.content;
        const response = await fetch(dataUrl);
        const buf = new Uint8Array(await response.arrayBuffer());

        let img: PDFImage;
        if (dataUrl.includes('image/png') || dataUrl.includes('.png')) {
          img = await doc.embedPng(buf);
        } else {
          img = await doc.embedJpg(buf);
        }

        const w = annotation.width || 150;
        const h = annotation.height || 50;
        page.drawImage(img, {
          x: annotation.x,
          y: height - annotation.y - h,
          width: w,
          height: h,
        });
      } catch {}
    }
  }

  return doc.save();
}

export async function extractPdfText(pdfBytes: Uint8Array): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const lines: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item: any) => item.str !== undefined)
      .map((item: any) => item.str)
      .join(' ');
    if (pageText.trim()) lines.push(pageText);
  }

  return lines.join('\n\n');
}

export async function exportPdfAsImages(
  pdfBytes: Uint8Array,
  format: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<Blob[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
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
