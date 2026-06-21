# PDFSenior (Conv2PDF) — Development Notes

## Project Overview
PDFSenior is a web-based PDF tools suite built with **Astro + React + Tailwind CSS**, deployed on **Cloudflare**. It provides 10 PDF tools — most run client-side using **pdfjs-dist v4** and **pdf-lib**.

## Architecture

### Tool Categories
1. **Client-side tools (pdf-lib)**: Merge, Split, Compress, Rotate, Watermark, JPG-to-PDF
2. **Editor tools (pdfjs + pdf-lib)**: Annotate (text, draw, highlight, notes, images), Sign, PDF-to-Images
3. **Server-side conversion (Firebase Functions v1)**: PDF-to-Word (DOCX), PDF-to-Text (TXT)

### Key Components
- **`src/components/PdfEditor.tsx`** — Main editor: PDF rendering, annotations, drawing, signature, image insertion
- **`src/components/EditorToolbar.tsx`** — Toolbar with Lucide icons (Texte, Signer, Dessiner, etc.)
- **`src/components/PageThumbnails.tsx`** — Left sidebar with page thumbnails
- **`src/components/SignatureModal.tsx`** — Signature capture modal
- **`src/components/ExportModal.tsx`** — Export dialog (PDF, DOCX, JPG, PNG, TXT)
- **`src/components/tools/*.tsx`** — Standalone tool components (MergePdf, SplitPdf, CompressPdf, RotatePdf, WatermarkPdf, JpgToPdf)
- **`src/components/ToolLayout.astro`** — Shared layout for tool pages
- **`src/stores/app-store.ts`** — Nanostores for global state
- **`src/lib/pdf-utils.ts`** — PDF utilities (load, export with annotations, export as images)
- **`src/lib/font-utils.ts`** — Font matching and embedding for annotation text export
- **`src/lib/file-storage.ts`** — IndexedDB storage for loaded PDF files

### Pages
- `/` — Landing page with tools grid (iLovePDF-style)
- `/editor` — PDF editor (annotate, sign, convert, export)
- `/tools/merge` — Merge multiple PDFs
- `/tools/split` — Split/extract PDF pages
- `/tools/compress` — Compress PDF (strip metadata, optimize)
- `/tools/rotate` — Rotate PDF pages
- `/tools/watermark` — Add text watermark
- `/tools/jpg-to-pdf` — Convert images to PDF
- `/pricing` — Pricing page

## Key Decisions & Lessons Learned

### What Was Tried and Abandoned
- **Inline text editing of existing PDF content** — Tried multiple approaches (contentEditable overlays, popup modal with font matching, rebuildPdf). All had issues: font mismatch, ghosting, incorrect colors, subset font fallback to Helvetica. Decision: removed entirely — focus on annotation-based features that work 100%.
- **Nutrient/PSPDFKit** — Viewer-only is free; Editor requires $3000+/year license
- **Syncfusion** — PDF Viewer only, cannot edit existing text content

### What Works Well
- **pdf-lib** for PDF manipulation (merge, split, rotate, watermark, compress) — reliable and fast
- **pdfjs TextLayer** for text selection/copy in the viewer
- **Client-side processing** for privacy and speed — no server upload needed for most tools
- **Firebase Functions v1** for PDF-to-Word conversion using pdf-parse + docx npm packages

## Firebase Function
- **Deployed at**: `https://us-central1-atfagni.cloudfunctions.net/convert`
- **Pattern**: Firebase Functions v1 (`functions.runWith().https.onRequest()`)
- **Supports**: `txt` (pdf-parse text extraction), `docx` (pdf-parse + docx npm package)
- **Lazy-loads** pdf-parse via `require("pdf-parse/lib/pdf-parse")` to avoid deploy timeout

## Dependencies
- **pdfjs-dist** v4 — PDF rendering + text extraction
- **pdf-lib** — PDF manipulation (merge, split, rotate, watermark, compress, annotations export)
- **fontkit** — Font parsing (used by pdf-lib for font embedding)
- **lucide-react** — Icons
- **nanostores** + **@nanostores/react** — State management
- **Astro** v5 + **@astrojs/react** + **@astrojs/tailwind** — Framework
- **@astrojs/cloudflare** — Deployment adapter

## File Structure
```
src/
├── components/
│   ├── PdfEditor.tsx          # Main editor (annotations, drawing, signature)
│   ├── EditorToolbar.tsx      # Toolbar with tool buttons
│   ├── PageThumbnails.tsx     # Sidebar thumbnails
│   ├── SignatureModal.tsx     # Signature capture
│   ├── ExportModal.tsx        # Export dialog
│   ├── UploadZone.tsx         # File upload component
│   ├── Hero.astro             # Landing hero section
│   ├── Features.astro         # Tools grid section
│   ├── Header.astro           # Site header/nav
│   ├── Footer.astro           # Site footer
│   ├── ToolLayout.astro       # Shared tool page layout
│   └── tools/
│       ├── MergePdf.tsx
│       ├── SplitPdf.tsx
│       ├── CompressPdf.tsx
│       ├── RotatePdf.tsx
│       ├── WatermarkPdf.tsx
│       └── JpgToPdf.tsx
├── lib/
│   ├── pdf-utils.ts           # PDF load/export utilities
│   ├── font-utils.ts          # Font matching/embedding
│   └── file-storage.ts        # IndexedDB storage
├── stores/
│   └── app-store.ts           # Nanostores global state
├── styles/
│   └── global.css             # Tailwind + pdfjs TextLayer CSS
└── pages/
    ├── index.astro            # Landing page
    ├── editor.astro           # Editor page
    ├── pricing.astro          # Pricing page
    └── tools/
        ├── merge.astro
        ├── split.astro
        ├── compress.astro
        ├── rotate.astro
        ├── watermark.astro
        └── jpg-to-pdf.astro
```
