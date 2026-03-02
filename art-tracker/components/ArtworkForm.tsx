'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from './ImageUpload';

interface ArtworkData {
  id?: number;
  title?: string;
  artist?: string;
  year_created?: string;
  medium?: string;
  dimensions?: string;
  current_location?: string;
  price_paid?: number | null;
  date_acquired?: string;
  notes?: string;
  image_path?: string;
}

export default function ArtworkForm({ initial }: { initial?: ArtworkData }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState({
    title: initial?.title ?? '',
    artist: initial?.artist ?? '',
    year_created: initial?.year_created ?? '',
    medium: initial?.medium ?? '',
    dimensions: initial?.dimensions ?? '',
    current_location: initial?.current_location ?? '',
    price_paid: initial?.price_paid != null ? String(initial.price_paid) : '',
    date_acquired: initial?.date_acquired ?? '',
    notes: initial?.notes ?? '',
    image_path: initial?.image_path ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        price_paid: form.price_paid !== '' ? parseFloat(form.price_paid) : null,
      };
      const url = isEdit ? `/api/artworks/${initial!.id}` : '/api/artworks';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      router.push(`/collection/${data.id}`);
      router.refresh();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded p-3">{error}</p>}

      <Field label="Title *">
        <input className={input} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Sunset Over the Valley" required />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Artist">
          <input className={input} value={form.artist} onChange={(e) => set('artist', e.target.value)} placeholder="e.g. Jane Doe" />
        </Field>
        <Field label="Year Created">
          <input className={input} value={form.year_created} onChange={(e) => set('year_created', e.target.value)} placeholder="e.g. 2019" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Medium">
          <input className={input} value={form.medium} onChange={(e) => set('medium', e.target.value)} placeholder="e.g. Oil on canvas" />
        </Field>
        <Field label="Dimensions">
          <input className={input} value={form.dimensions} onChange={(e) => set('dimensions', e.target.value)} placeholder="e.g. 24&quot; × 36&quot;" />
        </Field>
      </div>

      <Field label="Current Location">
        <input className={input} value={form.current_location} onChange={(e) => set('current_location', e.target.value)} placeholder="e.g. Living room, east wall" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Price Paid ($)">
          <input className={input} type="number" min="0" step="0.01" value={form.price_paid} onChange={(e) => set('price_paid', e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Date Acquired">
          <input className={input} type="date" value={form.date_acquired} onChange={(e) => set('date_acquired', e.target.value)} />
        </Field>
      </div>

      <Field label="Notes">
        <textarea className={`${input} h-28 resize-y`} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Provenance, condition, story behind the piece…" />
      </Field>

      <Field label="Image">
        <ImageUpload value={form.image_path} onChange={(p) => set('image_path', p)} />
      </Field>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Artwork'}
        </button>
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

const input = 'w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
