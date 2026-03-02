'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SoldGiftedForm from './SoldGiftedForm';

interface SoldGiftedRecord {
  id: number;
  title: string;
  description: string;
  year_created: string;
  medium: string;
  dimensions: string;
  recipient_name: string;
  recipient_contact: string;
  type: 'sold' | 'gifted';
  price_received: number | null;
  date: string;
  notes: string;
  image_path: string;
  created_at: string;
  updated_at: string;
}

export default function SoldGiftedDetail({ record }: { record: SoldGiftedRecord }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete record for "${record.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/sold-gifted/${record.id}`, { method: 'DELETE' });
    router.push('/sold-gifted');
    router.refresh();
  }

  if (editing) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setEditing(false)} className="text-stone-400 hover:text-stone-600 text-sm">← Back</button>
          <h1 className="text-2xl font-bold text-stone-800">Edit Record</h1>
        </div>
        <SoldGiftedForm initial={record} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/sold-gifted" className="text-stone-400 hover:text-stone-600 text-sm">← Sold & Gifted</Link>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {record.image_path && (
          <div className="w-full max-h-96 bg-stone-100 overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={record.image_path} alt={record.title} className="max-w-full max-h-96 object-contain" />
          </div>
        )}
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-stone-800">{record.title}</h1>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${record.type === 'sold' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {record.type}
                </span>
              </div>
              {record.description && <p className="text-stone-500 text-sm">{record.description}</p>}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors">Edit</button>
              <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Artwork Details</p>
            <dl className="grid grid-cols-2 gap-4">
              {[
                { label: 'Year Created', value: record.year_created },
                { label: 'Medium', value: record.medium },
                { label: 'Dimensions', value: record.dimensions },
              ].filter(({ value }) => value).map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs font-medium text-stone-400 uppercase tracking-wide">{label}</dt>
                  <dd className="text-sm text-stone-700 mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Recipient</p>
            <dl className="grid grid-cols-2 gap-4">
              {[
                { label: 'Name', value: record.recipient_name },
                { label: 'Contact', value: record.recipient_contact },
                { label: record.type === 'sold' ? 'Price Received' : null, value: record.type === 'sold' && record.price_received != null ? `$${record.price_received.toLocaleString()}` : null },
                { label: 'Date', value: record.date },
              ].filter(({ value, label }) => value && label).map(({ label, value }) => (
                <div key={label!}>
                  <dt className="text-xs font-medium text-stone-400 uppercase tracking-wide">{label}</dt>
                  <dd className="text-sm text-stone-700 mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {record.notes && (
            <div>
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{record.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
