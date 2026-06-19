import { useStore } from '@nanostores/react';
import { $activeTool, $showExportModal, $drawColor, $fontSize, type EditorTool } from '../stores/app-store';

const tools: { id: EditorTool; label: string; icon: string }[] = [
  {
    id: 'text',
    label: 'Ajouter du texte',
    icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h8m-8 6h16" /></svg>',
  },
  {
    id: 'sign',
    label: 'Signer',
    icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>',
  },
  {
    id: 'draw',
    label: 'Dessiner',
    icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>',
  },
  {
    id: 'highlight',
    label: 'Surligner',
    icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 3l6 6-9 9H6v-6l9-9z" /></svg>',
  },
  {
    id: 'erase',
    label: 'Effacer',
    icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" /></svg>',
  },
];

export default function EditorToolbar() {
  const activeTool = useStore($activeTool);
  const drawColor = useStore($drawColor);
  const fontSize = useStore($fontSize);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left tools */}
        <div className="flex items-center gap-1">
          {/* Undo/Redo */}
          <button
            className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Annuler"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>
          <button
            className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Recommencer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </svg>
          </button>

          <div className="w-px h-8 bg-gray-200 mx-2" />

          {/* Main tools */}
          {tools.map((tool) => (
            <button
              key={tool.id}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTool === tool.id
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
              onClick={() => $activeTool.set(tool.id)}
              title={tool.label}
            >
              <span dangerouslySetInnerHTML={{ __html: tool.icon }} />
              <span className="hidden lg:inline">{tool.label}</span>
            </button>
          ))}

          {/* Color/Size controls when drawing */}
          {(activeTool === 'draw' || activeTool === 'text' || activeTool === 'highlight') && (
            <>
              <div className="w-px h-8 bg-gray-200 mx-2" />
              <input
                type="color"
                value={drawColor}
                onChange={(e) => $drawColor.set(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                title="Couleur"
              />
              {activeTool === 'text' && (
                <select
                  value={fontSize}
                  onChange={(e) => $fontSize.set(Number(e.target.value))}
                  className="ml-2 px-2 py-1 border border-gray-200 rounded-lg text-sm"
                >
                  {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64].map((s) => (
                    <option key={s} value={s}>{s}px</option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            title="Gérer les pages"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            <span>Gérer les pages</span>
          </button>

          <button
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => window.print()}
            title="Imprimer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            <span>Imprimer</span>
          </button>

          <div className="w-px h-8 bg-gray-200 mx-1" />

          {/* Send by email */}
          <button className="btn-outline !py-2 !px-4 text-sm">
            Envoyer par e-mail
          </button>

          {/* Done / Export */}
          <button
            className="btn-primary !py-2 !px-6 text-sm flex items-center gap-2"
            onClick={() => $showExportModal.set(true)}
          >
            Terminé
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
