'use client';

import { useRef, useState } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  shape?: 'square' | 'circle';
  previewSize?: 'sm' | 'md';
  accept?: string;
}

export default function ImageUpload({
  value,
  onChange,
  folder = 'uploads',
  label,
  shape = 'square',
  previewSize = 'md',
  accept = 'image/png,image/jpeg,image/webp,image/svg+xml',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const preview = previewSize === 'sm' ? 'w-12 h-12' : 'w-16 h-16';
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await api.post('/upload/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onChange(res.data.url);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          {label}
        </label>
      )}

      <div className="flex items-center gap-3">
        {/* Preview */}
        <div
          className={`${preview} ${radius} bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600 shrink-0`}
        >
          {value ? (
            <img
              src={value}
              alt="Preview"
              className={`w-full h-full object-contain ${radius}`}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <ImageIcon className="w-5 h-5 text-slate-300 dark:text-slate-600" />
          )}
        </div>

        {/* Actions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-2 bg-[var(--brand)]/10 hover:bg-[var(--brand)]/20 text-[var(--brand)] rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              {uploading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Upload className="w-3.5 h-3.5" />
              }
              {uploading ? 'Uploading…' : 'Upload Image'}
            </button>

            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 transition-all"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {value && (
            <p className="text-[10px] text-slate-400 font-mono truncate mt-1 max-w-[200px]">
              {value.split('/').pop()}
            </p>
          )}

          {error && (
            <p className="text-[10px] text-red-500 mt-1">{error}</p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
