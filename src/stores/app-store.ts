import { atom, map } from 'nanostores';

export const $uploadedFile = atom<File | null>(null);
export const $pdfBytes = atom<Uint8Array | null>(null);
export const $fileName = atom<string>('');
export const $currentPage = atom<number>(1);
export const $totalPages = atom<number>(0);
export const $isAuthenticated = atom<boolean>(false);
export const $showAuthModal = atom<boolean>(false);
export const $showExportModal = atom<boolean>(false);
export const $showSignModal = atom<boolean>(false);
export const $selectedFormat = atom<string>('PDF');
function checkPaymentStatus(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('pdfsenior_payment');
    if (!stored) return false;
    const { expiresAt } = JSON.parse(stored);
    if (Date.now() < expiresAt) return true;
    localStorage.removeItem('pdfsenior_payment');
  } catch {}
  return false;
}

export const $isPaid = atom<boolean>(checkPaymentStatus());

export function setPaid(planId: string) {
  const durations: Record<string, number> = {
    'single': 30 * 60 * 1000,
    'day-pass': 24 * 60 * 60 * 1000,
    'monthly': 30 * 24 * 60 * 60 * 1000,
  };
  const duration = durations[planId] || 24 * 60 * 60 * 1000;
  const data = { planId, expiresAt: Date.now() + duration };
  localStorage.setItem('pdfsenior_payment', JSON.stringify(data));
  $isPaid.set(true);
}

export const $user = map<{
  id: string;
  email: string;
  name: string;
} | null>(null);

export type EditorTool = 'select' | 'text' | 'draw' | 'sign' | 'line' | 'erase' | 'highlight' | 'image' | 'note';
export const $activeTool = atom<EditorTool>('select');
export const $drawColor = atom<string>('#000000');
export const $fontSize = atom<number>(16);
export const $fontFamily = atom<string>('Inter');
export const $fontBold = atom<boolean>(false);
export const $fontItalic = atom<boolean>(false);
export const $lineWidth = atom<number>(2);

export interface Annotation {
  id: string;
  type: 'text' | 'drawing' | 'signature' | 'image' | 'line' | 'highlight' | 'note';
  page: number;
  x: number;
  y: number;
  content: string;
  width?: number;
  height?: number;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  lineWidth?: number;
  endX?: number;
  endY?: number;
  selected?: boolean;
}

export const $annotations = atom<Annotation[]>([]);

// History for undo/redo
interface HistoryState {
  states: Annotation[][];
  index: number;
}

export const $history = atom<HistoryState>({ states: [[]], index: 0 });

function pushHistory(annotations: Annotation[]) {
  const h = $history.get();
  const newStates = h.states.slice(0, h.index + 1);
  newStates.push([...annotations]);
  $history.set({ states: newStates, index: newStates.length - 1 });
}

export function addAnnotation(annotation: Annotation) {
  const next = [...$annotations.get(), annotation];
  $annotations.set(next);
  pushHistory(next);
}

export function updateAnnotation(id: string, updates: Partial<Annotation>) {
  const next = $annotations.get().map(a => a.id === id ? { ...a, ...updates } : a);
  $annotations.set(next);
  pushHistory(next);
}

export function removeAnnotation(id: string) {
  const next = $annotations.get().filter(a => a.id !== id);
  $annotations.set(next);
  pushHistory(next);
}

export function undo() {
  const h = $history.get();
  if (h.index <= 0) return;
  const newIndex = h.index - 1;
  $history.set({ ...h, index: newIndex });
  $annotations.set([...h.states[newIndex]]);
}

export function redo() {
  const h = $history.get();
  if (h.index >= h.states.length - 1) return;
  const newIndex = h.index + 1;
  $history.set({ ...h, index: newIndex });
  $annotations.set([...h.states[newIndex]]);
}

export function selectAnnotation(id: string | null) {
  $annotations.set($annotations.get().map(a => ({ ...a, selected: a.id === id })));
}
