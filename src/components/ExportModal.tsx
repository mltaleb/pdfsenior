import { useState } from 'react';
import { useStore } from '@nanostores/react';
import {
  $showExportModal, $selectedFormat, $fileName,
  $pdfBytes, $annotations, $isPaid
} from '../stores/app-store';
import { applyAnnotationsAndExport, exportPdfAsImages } from '../lib/pdf-utils';

const formats = [
  { id: 'PDF', label: 'PDF', color: '#EF4444', icon: 'PDF' },
  { id: 'DOCX', label: 'Word', color: '#2563EB', icon: 'DOCX' },
  { id: 'JPG', label: 'JPG', color: '#10B981', icon: 'JPG' },
  { id: 'PNG', label: 'PNG', color: '#8B5CF6', icon: 'PNG' },
  { id: 'TXT', label: 'Texte', color: '#6B7280', icon: 'TXT' },
];

export default function ExportModal() {
  const showModal = useStore($showExportModal);
  const selectedFormat = useStore($selectedFormat);
  const fileName = useStore($fileName);
  const pdfBytes = useStore($pdfBytes);
  const annotations = useStore($annotations);
  const isPaid = useStore($isPaid);
  const [exporting, setExporting] = useState(false);

  if (!showModal) return null;

  const handleDownload = async () => {
    if (!isPaid) {
      $showExportModal.set(false);
      window.location.href = '/pricing';
      return;
    }

    if (!pdfBytes) return;
    setExporting(true);

    try {
      const clientFormats = ['PDF', 'JPG', 'PNG'];

      if (clientFormats.includes(selectedFormat)) {
        if (selectedFormat === 'PDF') {
          const exportedBytes = await applyAnnotationsAndExport(pdfBytes, annotations);
          downloadBlob(new Blob([exportedBytes], { type: 'application/pdf' }), `${fileName}.pdf`);
        } else if (selectedFormat === 'JPG' || selectedFormat === 'PNG') {
          const mimeType = selectedFormat === 'JPG' ? 'image/jpeg' : 'image/png';
          const blobs = await exportPdfAsImages(pdfBytes, mimeType);
          if (blobs.length === 1) {
            downloadBlob(blobs[0], `${fileName}.${selectedFormat.toLowerCase()}`);
          } else {
            for (let i = 0; i < blobs.length; i++) {
              downloadBlob(blobs[i], `${fileName}_page${i + 1}.${selectedFormat.toLowerCase()}`);
            }
          }
        }
      } else {
        // Server-side conversion via Firebase Functions
        const exportedBytes = await applyAnnotationsAndExport(pdfBytes, annotations);
        const formData = new FormData();
        formData.append('file', new Blob([exportedBytes], { type: 'application/pdf' }));
        formData.append('format', selectedFormat.toLowerCase());
        formData.append('fileName', fileName);

        const functionsUrl = import.meta.env.PUBLIC_FIREBASE_FUNCTIONS_URL || '';
        if (!functionsUrl) {
          alert('La conversion serveur n\'est pas encore configurée. Veuillez utiliser PDF, JPG ou PNG pour le moment.');
          setExporting(false);
          return;
        }

        const response = await fetch(`${functionsUrl}/convert`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Conversion failed');

        const blob = await response.blob();
        downloadBlob(blob, `${fileName}.${selectedFormat.toLowerCase()}`);
      }

      $showExportModal.set(false);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Une erreur est survenue lors de l\'export. Veuillez réessayer.');
    } finally {
      setExporting(false);
    }
  };

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-overlay" onClick={() => $showExportModal.set(false)}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={() => $showExportModal.set(false)}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header with celebration */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Super !</h2>
          <p className="text-gray-600 mt-1">Votre document est en cours de préparation</p>
        </div>

        {/* Format selection */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Télécharger au format :</p>
          <div className="grid grid-cols-2 gap-2">
            {formats.map((format) => (
              <button
                key={format.id}
                className={`format-option ${selectedFormat === format.id ? 'selected' : ''}`}
                onClick={() => $selectedFormat.set(format.id)}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: format.color }}
                >
                  {format.icon}
                </div>
                <span className="font-medium text-gray-800">{format.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* File name */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Nom du fichier :</label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => $fileName.set(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => $showExportModal.set(false)}
            className="flex-1 btn-outline"
          >
            Annuler
          </button>
          <button
            onClick={handleDownload}
            disabled={exporting}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Export...
              </span>
            ) : (
              'Télécharger'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
