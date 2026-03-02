'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from './ImageUpload';

interface RecordData {
  id?: number;
  title?: string;
  description?: string;
  year_created?: string;
  medium?: string;
  dimensions?: string;
  recipient_name?: string;
  recipient_contact?: string;
  type?: 'sold' | 'gifted';
  price_received?: number | null;
  date?: string;
  notes?: string;
  image_path?: string;
}

export default function SoldGiftedForm({ initial }: { initial?: RecordData }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    year_created: initial?.year_created ?? '',
    medium: initial?.medium ?? '',
    dimensions: initial?.dimensions ?? '',
    recipient_name: initial?.recipient_name ?? '',
    recipient_contact: initial?.recipient_contact ?? '',
    type: (initial?.type ?? 'gifted') as 'sold' | 'gifted',
    price_received: initial?.price_received != null ? String(initial.price_received) : '',
    date: initial?.date ?? '',
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
    if (!form.recipient_name.trim()) { setError('Recipient name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        price_received: form.price_received !== '' ? parseFloat(form.price_received) : null,
      };
      const url = isEdit ? `/api/sold-gifted/${initial!.id}` : '/api/sold-gifted';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      router.push(`/sold-gifted/${data.id}`);
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

      <Field label="Artwork Title *">
        <input className={input} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Blue Morning" required />
      </Field>

      <Field label="Description">
        <textarea className={`${input} h-20 resize-y`} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Brief description of the artwork" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Year Created">
          <input className={input} value={form.year_created} onChange={(e) => set('year_created', e.target.value)} placeholder="e.g. 2021" />
        </Field>
        <Field label="Medium">
          <input className={input} value={form.medium} onChange={(e) => set('medium', e.target.value)} placeholder="e.g. Watercolor" />
        </Field>
      </div>

      <Field label="Dimensions">
        <input className={input} value={form.dimensions} onChange={(e) => set('dimensions', e.target.value)} placeholder={`e.g. 18" × 24"`} />
      </Field>

      <div className="border-t border-stone-100 pt-5">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-4">Recipient</p>

        <Field label="Type">
          <div className="flex gap-4">
            {(['gifted', 'sold'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={form.type === t}
                  onChange={() => set('type', t)}
                  className="accent-amber-500"
                />
                <span className="text-sm capitalize text-stone-700">{t}</span>
              </label>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Field label="Recipient Name *">
            <input className={input} value={form.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} placeholder="Full name" required />
          </Field>
          <Field label="Recipient Contact">
            <input className={input} value={form.recipient_contact} onChange={(e) => set('recipient_contact', e.target.value)} placeholder="Email, phone, etc." />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {form.type === 'sold' && (
            <Field label="Price Received ($)">
              <input className={input} type="number" min="0" step="0.01" value={form.price_received} onChange={(e) => set('price_received', e.target.value)} placeholder="0.00" />
            </Field>
          )}
          <Field label="Date">
            <input className={input} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
        </div>
      </div>

      <Field label="Notes">
        <textarea className={`${input} h-24 resize-y`} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any additional details…" />
      </Field>

      <Field label="Image">
        <ImageUpload value={form.image_path} onChange={(p) => set('image_path', p)} />
      </Field>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Record'}
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
