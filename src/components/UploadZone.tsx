import { useState, useRef, useCallback } from 'react';
import { $uploadedFile, $pdfBytes, $fileName } from '../stores/app-store';
import { loadPdfFromFile } from '../lib/pdf-utils';
import { saveFile } from '../lib/file-storage';

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

export default function UploadZone() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 90));
    }, 100);

    try {
      $uploadedFile.set(file);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      $fileName.set(nameWithoutExt);

      const bytes = await loadPdfFromFile(file);
      $pdfBytes.set(bytes);
      await saveFile(bytes, nameWithoutExt);

      clearInterval(interval);
      setProgress(100);

      setTimeout(() => {
        window.location.href = '/editor';
      }, 500);
    } catch {
      clearInterval(interval);
      setUploading(false);
      setProgress(0);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setDragging(false), []);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (uploading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-primary-50 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chargement en cours...</h3>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">{progress}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
      <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
        Téléchargez vos fichiers
      </h2>

      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-4">
          {/* PDF icon cluster */}
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-20 bg-white rounded-lg shadow-md border border-gray-200 flex items-center justify-center">
                <span className="text-xs font-bold text-primary-500 bg-primary-50 px-2 py-1 rounded">PDF</span>
              </div>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center border-2 border-white shadow">
                <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
            </div>
          </div>

          <p className="text-gray-700 font-medium">Déposez vos PDF ici</p>

          <div className="flex items-center gap-4 w-full max-w-xs">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-400 font-medium">OU</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Importer pour modifier
          </button>

          <p className="text-xs text-gray-400">
            Téléversez des documents jusqu'à 100 Mo
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
        className="hidden"
        onChange={onFileSelect}
      />
    </div>
  );
}
