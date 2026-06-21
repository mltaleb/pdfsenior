import fontkit from '@pdf-lib/fontkit';
import type { PDFDocument } from 'pdf-lib';
import { StandardFonts } from 'pdf-lib';

export { fontkit };

type FontCategory = 'sans' | 'serif' | 'mono';

type FontStyle = 'regular' | 'bold' | 'italic' | 'boldItalic';

const FONT_FILES: Record<FontCategory, Record<FontStyle, string>> = {
  sans: {
    regular: '/fonts/Inter-Regular.ttf',
    bold: '/fonts/Inter-Bold.ttf',
    italic: '/fonts/Inter-Italic.ttf',
    boldItalic: '/fonts/Inter-BoldItalic.ttf',
  },
  serif: {
    regular: '/fonts/NotoSerif-Regular.ttf',
    bold: '/fonts/NotoSerif-Bold.ttf',
    italic: '/fonts/NotoSerif-Italic.ttf',
    boldItalic: '/fonts/NotoSerif-BoldItalic.ttf',
  },
  mono: {
    regular: '/fonts/RobotoMono-Regular.ttf',
    bold: '/fonts/RobotoMono-Bold.ttf',
    italic: '/fonts/RobotoMono-Italic.ttf',
    boldItalic: '/fonts/RobotoMono-BoldItalic.ttf',
  },
};

const WEB_FONT_FAMILIES: Record<FontCategory, string> = {
  sans: "'Inter', sans-serif",
  serif: "'Noto Serif', serif",
  mono: "'Roboto Mono', monospace",
};

const fontBytesCache = new Map<string, Uint8Array>();
const failedFonts = new Set<string>();

export function detectFontCategory(rawFontName: string, fontFamily: string): FontCategory {
  const combined = `${rawFontName} ${fontFamily}`.toLowerCase();
  if (/courier|consolas|monaco|mono|menlo|lucida\s*console/i.test(combined)) return 'mono';
  if (/times|georgia|palatino|garamond|bookman|cambria/i.test(combined)) return 'serif';
  if (/serif/i.test(combined) && !/sans/i.test(combined)) return 'serif';
  return 'sans';
}

export function getWebFontFamily(rawFontName: string, fontFamily: string): string {
  const category = detectFontCategory(rawFontName, fontFamily);
  return WEB_FONT_FAMILIES[category];
}

export function getDisplayFontName(rawFontName: string, fontFamily: string): string {
  const combined = `${rawFontName} ${fontFamily}`;
  const knownFonts: [RegExp, string][] = [
    [/calibri/i, 'Calibri'],
    [/arial/i, 'Arial'],
    [/helvetica/i, 'Helvetica'],
    [/times\s*new\s*roman/i, 'Times New Roman'],
    [/times/i, 'Times'],
    [/courier\s*new/i, 'Courier New'],
    [/courier/i, 'Courier'],
    [/georgia/i, 'Georgia'],
    [/verdana/i, 'Verdana'],
    [/tahoma/i, 'Tahoma'],
    [/trebuchet/i, 'Trebuchet MS'],
    [/segoe/i, 'Segoe UI'],
    [/cambria/i, 'Cambria'],
    [/garamond/i, 'Garamond'],
    [/palatino/i, 'Palatino'],
    [/consolas/i, 'Consolas'],
    [/roboto/i, 'Roboto'],
    [/inter/i, 'Inter'],
    [/noto\s*serif/i, 'Noto Serif'],
    [/noto\s*sans/i, 'Noto Sans'],
  ];
  for (const [re, name] of knownFonts) {
    if (re.test(combined)) return name;
  }

  const category = detectFontCategory(rawFontName, fontFamily);
  switch (category) {
    case 'serif': return 'Serif';
    case 'mono': return 'Monospace';
    default: return 'Sans-serif';
  }
}

export async function fetchMatchingFont(
  rawFontName: string,
  fontFamily: string,
  isBold: boolean,
  isItalic: boolean,
): Promise<Uint8Array | null> {
  const category = detectFontCategory(rawFontName, fontFamily);
  const style: FontStyle = isBold && isItalic ? 'boldItalic' : isBold ? 'bold' : isItalic ? 'italic' : 'regular';
  const cacheKey = `${category}-${style}`;

  if (fontBytesCache.has(cacheKey)) return fontBytesCache.get(cacheKey)!;
  if (failedFonts.has(cacheKey)) return null;

  const url = FONT_FILES[category][style];

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      failedFonts.add(cacheKey);
      return null;
    }
    const bytes = new Uint8Array(await resp.arrayBuffer());
    fontBytesCache.set(cacheKey, bytes);
    return bytes;
  } catch {
    failedFonts.add(cacheKey);
    return null;
  }
}

export async function embedMatchingFont(
  pdfDoc: PDFDocument,
  rawFontName: string,
  fontFamily: string,
  isBold: boolean,
  isItalic: boolean,
): Promise<ReturnType<PDFDocument['embedFont']>> {
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = await fetchMatchingFont(rawFontName, fontFamily, isBold, isItalic);
  if (fontBytes) {
    try {
      return await pdfDoc.embedFont(fontBytes);
    } catch {
      // fontkit couldn't parse the font file — fall through to StandardFonts
    }
  }

  return embedStandardFont(pdfDoc, fontFamily, isBold, isItalic);
}

export async function embedStandardFont(
  pdfDoc: PDFDocument,
  fontFamily: string,
  isBold: boolean,
  isItalic: boolean,
): Promise<ReturnType<PDFDocument['embedFont']>> {
  const isSans = fontFamily.includes('sans-serif') || !fontFamily.includes('serif');
  const isSerif = fontFamily.includes('serif') && !fontFamily.includes('sans-serif');
  const isMono = /mono|courier/i.test(fontFamily);

  let stdFont: keyof typeof StandardFonts = 'Helvetica';
  if (isSerif) stdFont = 'TimesRoman';
  else if (isMono) stdFont = 'Courier';

  if (isBold && isItalic) {
    if (stdFont === 'TimesRoman') stdFont = 'TimesRomanBoldItalic';
    else if (stdFont === 'Courier') stdFont = 'CourierBoldOblique';
    else stdFont = 'HelveticaBoldOblique';
  } else if (isBold) {
    if (stdFont === 'TimesRoman') stdFont = 'TimesRomanBold';
    else if (stdFont === 'Courier') stdFont = 'CourierBold';
    else stdFont = 'HelveticaBold';
  } else if (isItalic) {
    if (stdFont === 'TimesRoman') stdFont = 'TimesRomanItalic';
    else if (stdFont === 'Courier') stdFont = 'CourierOblique';
    else stdFont = 'HelveticaOblique';
  }

  return pdfDoc.embedFont(StandardFonts[stdFont]);
}
