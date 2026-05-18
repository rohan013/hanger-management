'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { uploadClothing } from '@/lib/api/client';

type FileStatus = 'pending' | 'uploading' | 'done' | 'error';

type FileEntry = {
  file: File;
  preview: string;
  status: FileStatus;
  error?: string;
};

function updateEntryStatus(
  entries: FileEntry[],
  file: File,
  status: FileStatus,
  error?: string,
): FileEntry[] {
  return entries.map(e =>
    e.file === file ? { ...e, status, error } : e
  );
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const valid: FileEntry[] = [];

    for (const file of incoming) {
      if (!file.type.startsWith('image/')) continue;
      valid.push({
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
      });
    }

    setEntries(prev => {
      const existing = new Set(prev.map(e => `${e.file.name}:${e.file.size}`));
      const deduped = valid.filter(e => !existing.has(`${e.file.name}:${e.file.size}`));
      return [...prev, ...deduped];
    });
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeEntry = useCallback((file: File) => {
    setEntries(prev => {
      const entry = prev.find(e => e.file === file);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter(e => e.file !== file);
    });
  }, []);

  const handleUpload = async () => {
    const pending = entries.filter(e => e.status === 'pending' || e.status === 'error');
    if (!pending.length) return;

    setUploading(true);

    for (const entry of pending) {
      setEntries(prev => updateEntryStatus(prev, entry.file, 'uploading'));
      try {
        await uploadClothing(entry.file);
        setEntries(prev => updateEntryStatus(prev, entry.file, 'done'));
      } catch (err) {
        setEntries(prev => updateEntryStatus(prev, entry.file, 'error', err instanceof Error ? err.message : 'Upload failed'));
      }
    }

    setUploading(false);

    setEntries(current => {
      if (current.some(e => e.status === 'done')) {
        router.push('/');
      }
      return current;
    });
  };

  const pendingCount = entries.filter(e => e.status === 'pending' || e.status === 'error').length;
  const uploadingIndex = entries.findIndex(e => e.status === 'uploading');
  const doneCount = entries.filter(e => e.status === 'done').length;

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Clothing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Select one or more photos. AI will analyze each one automatically.
        </p>
      </div>

      {entries.length === 0 ? (
        /* Drop zone */
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-indigo-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold mb-1">Tap to select photos</p>
          <p className="text-gray-400 text-sm">Select multiple items at once — JPG, PNG, HEIC, WebP up to 20MB each</p>
        </div>
      ) : (
        /* File grid */
        <div className="grid grid-cols-2 gap-3 mb-4">
          {entries.map((entry, i) => (
            <div key={i} className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              {/* Thumbnail */}
              <div className="relative aspect-square bg-gray-50">
                <Image
                  src={entry.preview}
                  alt={entry.file.name}
                  fill
                  className="object-cover"
                  unoptimized
                />

                {/* Uploading overlay */}
                {entry.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  </div>
                )}

                {/* Done overlay */}
                {entry.status === 'done' && (
                  <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shadow">
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Remove button (only when not actively uploading this item) */}
                {entry.status !== 'uploading' && entry.status !== 'done' && !uploading && (
                  <button
                    onClick={() => removeEntry(entry.file)}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-base font-bold hover:bg-black/70 transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Status row */}
              <div className="px-2.5 py-2">
                <p className="text-xs text-gray-600 truncate">{entry.file.name}</p>
                {entry.status === 'pending' && (
                  <span className="text-xs text-gray-400">Pending</span>
                )}
                {entry.status === 'uploading' && (
                  <span className="text-xs text-indigo-500 font-medium">Analyzing…</span>
                )}
                {entry.status === 'done' && (
                  <span className="text-xs text-green-600 font-medium">Done</span>
                )}
                {entry.status === 'error' && (
                  <span className="text-xs text-red-500" title={entry.error}>Failed — tap retry</span>
                )}
              </div>
            </div>
          ))}

          {/* Add more tile */}
          {!uploading && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-xs font-medium">Add more</span>
            </button>
          )}
        </div>
      )}

      {/* Upload button */}
      {entries.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading || pendingCount === 0}
          className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-semibold text-base hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60 mt-2"
        >
          {uploading
            ? `Uploading ${doneCount + 1} of ${doneCount + pendingCount + (uploadingIndex >= 0 ? 1 : 0)}…`
            : `Analyze & Save All (${pendingCount})`}
        </button>
      )}

      {/* Tips (only shown when no files selected) */}
      {entries.length === 0 && (
        <div className="mt-6 space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tips for best results</h3>
          {[
            'Lay clothing flat on a light background',
            'Good lighting helps the AI identify colors',
            'Include the full item in the frame',
          ].map((tip, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <p className="text-sm text-gray-600">{tip}</p>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
