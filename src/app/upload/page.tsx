'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { STORAGE_CONFIG } from '@/lib/config';
import { uploadClothing } from '@/lib/api/client';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > STORAGE_CONFIG.MAX_IMAGE_UPLOAD_BYTES) {
      setError(`File too large. Maximum size is ${STORAGE_CONFIG.MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)}MB.`);
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    // Simulate progress steps
    const progressSteps = [15, 35, 60, 80, 95];
    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setProgress(progressSteps[stepIndex]);
        stepIndex++;
      }
    }, 600);

    try {
      await uploadClothing(selectedFile);

      clearInterval(progressInterval);

      setProgress(100);
      // Brief pause to show 100% before redirecting
      await new Promise(r => setTimeout(r, 400));
      router.push('/');
    } catch (err) {
      clearInterval(progressInterval);
      setProgress(0);
      setUploading(false);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }
  };

  const handleReset = () => {
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Clothing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Take a photo or choose from your library. AI will analyze it automatically.
        </p>
      </div>

      {/* Drop zone / preview */}
      {!preview ? (
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
          <p className="text-gray-700 font-semibold mb-1">Tap to take photo or upload</p>
          <p className="text-gray-400 text-sm">Supports JPG, PNG, HEIC, WebP up to 10MB</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          {/* Preview image */}
          <div className="relative aspect-square bg-gray-100">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-contain"
              unoptimized
            />
            {!uploading && (
              <button
                onClick={handleReset}
                className="absolute top-3 right-3 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold hover:bg-black/70 transition-colors"
              >
                ×
              </button>
            )}
          </div>

          {/* File info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-800 truncate">{selectedFile?.name}</p>
            <p className="text-xs text-gray-400">
              {selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) + 'MB' : ''}
            </p>
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-600">
                  {progress < 35
                    ? 'Compressing image…'
                    : progress < 60
                    ? 'Uploading to storage…'
                    : progress < 90
                    ? 'Analyzing with AI…'
                    : 'Saving…'}
                </span>
                <span className="text-xs text-gray-400">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 items-start">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Upload button */}
      {preview && !uploading && (
        <button
          onClick={handleUpload}
          className="mt-4 w-full bg-indigo-600 text-white rounded-2xl py-4 font-semibold text-base hover:bg-indigo-700 active:scale-[0.98] transition-all"
        >
          Analyze & Save
        </button>
      )}

      {/* Cancel button */}
      {preview && !uploading && (
        <button
          onClick={handleReset}
          className="mt-2 w-full bg-gray-100 text-gray-600 rounded-2xl py-3.5 font-semibold text-sm hover:bg-gray-200 active:scale-[0.98] transition-all"
        >
          Choose Different Photo
        </button>
      )}

      {/* Tips */}
      {!preview && (
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
    </div>
  );
}
