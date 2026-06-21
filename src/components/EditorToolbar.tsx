import { useStore } from '@nanostores/react';
import { useRef } from 'react';
import {
  $activeTool, $showExportModal, $drawColor, $fontSize,
  $fontFamily, $fontBold, $fontItalic, $history, undo, redo,
  type EditorTool
} from '../stores/app-store';
import {
  MousePointer2, Type, PenLine, Highlighter, Image as ImageIcon,
  StickyNote, Trash2, Pen, Minus as LineIcon, FileSignature,
  Undo2, Redo2, Mail, Check
} from 'lucide-react';

const tools: { id: EditorTool; label: string; icon: typeof Type }[] = [
  { id: 'select', label: 'Selectionner', icon: MousePointer2 },
  { id: 'text', label: 'Texte', icon: Type },
  { id: 'sign', label: 'Signer', icon: FileSignature },
  { id: 'draw', label: 'Dessiner', icon: Pen },
  { id: 'line', label: 'Ligne', icon: LineIcon },
  { id: 'highlight', label: 'Surligner', icon: Highlighter },
  { id: 'image', label: 'Image', icon: ImageIcon },
  { id: 'note', label: 'Note', icon: StickyNote },
  { id: 'erase', label: 'Effacer', icon: Trash2 },
];

const fonts = ['Inter', 'Noto Serif', 'Roboto Mono', 'Arial', 'Calibri', 'Helvetica', 'Times New Roman', 'Times', 'Courier New', 'Courier', 'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Segoe UI', 'Cambria', 'Garamond', 'Consolas', 'Sans-serif', 'Serif', 'Monospace'];

export default function EditorToolbar() {
  const activeTool = useStore($activeTool);
  const drawColor = useStore($drawColor);
  const fontSz = useStore($fontSize);
  const fontFam = useStore($fontFamily);
  const bold = useStore($fontBold);
  const italic = useStore($fontItalic);
  const history = useStore($history);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      window.dispatchEvent(new CustomEvent('editor-insert-image', { detail: reader.result }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="bg-[#F9FAFB] border-b border-gray-200 shadow-sm">
      <div className="px-4 py-1 flex items-center justify-between gap-2 overflow-x-auto">
        {/* Left: Undo/Redo */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 transition-colors"
            title="Annuler (Ctrl+Z)"
            onClick={undo}
            disabled={history.index <= 0}
          >
            <Undo2 size={18} />
          </button>
          <button
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 transition-colors"
            title="Refaire (Ctrl+Y)"
            onClick={redo}
            disabled={history.index >= history.states.length - 1}
          >
            <Redo2 size={18} />
          </button>
          <div className="w-px h-8 bg-gray-200 mx-2" />
        </div>

        {/* Center: Tools */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                className={`flex flex-col items-center justify-center w-[72px] h-14 rounded-lg text-[11px] font-medium transition-all ${
                  isActive
                    ? 'text-primary-500 bg-primary-50 border border-primary-100'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-transparent'
                }`}
                onClick={() => {
                  $activeTool.set(tool.id);
                  if (tool.id === 'image') imageInputRef.current?.click();
                }}
                title={tool.label}
              >
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                <span className="mt-0.5 hidden sm:inline">{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-px h-8 bg-gray-200 mx-1" />
          <button className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <Mail size={14} />
            <span>E-mail</span>
          </button>
          <button
            className="flex items-center gap-1.5 bg-primary-500 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-primary-600 transition-colors shadow-sm"
            onClick={() => $showExportModal.set(true)}
          >
            Termine
            <Check size={16} strokeWidth={2.5} />
          </button>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* Context toolbar: font controls */}
      {(activeTool === 'text' || activeTool === 'note') && (
        <div className="px-4 py-1.5 border-t border-gray-200/60 flex items-center gap-3 bg-white/60">
          <input
            type="color"
            value={drawColor}
            onChange={(e) => $drawColor.set(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border border-gray-200"
            title="Couleur"
          />
          <div className="w-px h-6 bg-gray-200" />
          <select
            value={fontFam}
            onChange={(e) => $fontFamily.set(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white min-w-[130px] focus:outline-none focus:border-primary-300"
          >
            {fonts.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
            ))}
          </select>
          <select
            value={fontSz}
            onChange={(e) => $fontSize.set(Number(e.target.value))}
            className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white w-16 focus:outline-none focus:border-primary-300"
          >
            {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="w-px h-6 bg-gray-200" />
          <button
            className={`w-8 h-8 flex items-center justify-center rounded font-bold text-sm transition-colors ${bold ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-200 text-gray-500'}`}
            onClick={() => $fontBold.set(!bold)}
            title="Gras"
          >B</button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded italic text-sm transition-colors ${italic ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-200 text-gray-500'}`}
            onClick={() => $fontItalic.set(!italic)}
            title="Italique"
          >I</button>
        </div>
      )}

      {/* Draw controls */}
      {(activeTool === 'draw' || activeTool === 'line' || activeTool === 'highlight') && (
        <div className="px-4 py-1.5 border-t border-gray-200/60 flex items-center gap-3 bg-white/60">
          <input
            type="color"
            value={activeTool === 'highlight' ? '#FFFF00' : drawColor}
            onChange={(e) => $drawColor.set(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border border-gray-200"
            title="Couleur"
          />
          <span className="text-xs text-gray-500">Epaisseur :</span>
          <input
            type="range"
            min="1"
            max="10"
            defaultValue="2"
            className="w-24 accent-primary-500"
            onChange={(e) => {
              window.dispatchEvent(new CustomEvent('editor-line-width', { detail: Number(e.target.value) }));
            }}
          />
        </div>
      )}
    </div>
  );
}
