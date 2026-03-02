'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';

interface Props {
  value: string;
  onChange: (path: string) => void;
}

export default function ImageUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Upload failed');
        return;
      }
      const data = await res.json();
      onChange(data.path);
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value && (
        <div className="relative w-48 h-48 rounded overflow-hidden border border-stone-200">
          <Image src={value} alt="Artwork" fill className="object-cover" />
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 text-sm bg-stone-100 border border-stone-300 rounded hover:bg-stone-200 disabled:opacity-50 transition-colors"
        >
          {uploading ? 'Uploading…' : value ? 'Change Image' : 'Upload Image'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-red-500 hover:underline"
          >
            Remove
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
