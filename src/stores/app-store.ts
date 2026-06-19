import { atom, map } from 'nanostores';

export const $uploadedFile = atom<File | null>(null);
export const $pdfBytes = atom<Uint8Array | null>(null);
export const $fileName = atom<string>('');
export const $currentPage = atom<number>(1);
export const $totalPages = atom<number>(0);
export const $isAuthenticated = atom<boolean>(false);
export const $showAuthModal = atom<boolean>(false);
export const $showExportModal = atom<boolean>(false);
export const $selectedFormat = atom<string>('PDF');
export const $isPaid = atom<boolean>(false);

export const $user = map<{
  id: string;
  email: string;
  name: string;
} | null>(null);

export type EditorTool = 'select' | 'text' | 'draw' | 'sign' | 'erase' | 'highlight';
export const $activeTool = atom<EditorTool>('select');
export const $drawColor = atom<string>('#000000');
export const $fontSize = atom<number>(16);

export interface Annotation {
  id: string;
  type: 'text' | 'drawing' | 'signature';
  page: number;
  x: number;
  y: number;
  content: string;
  width?: number;
  height?: number;
  color?: string;
  fontSize?: number;
}

export const $annotations = atom<Annotation[]>([]);

export function addAnnotation(annotation: Annotation) {
  $annotations.set([...$annotations.get(), annotation]);
}

export function removeAnnotation(id: string) {
  $annotations.set($annotations.get().filter(a => a.id !== id));
}
