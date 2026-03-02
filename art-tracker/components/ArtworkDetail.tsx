'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ArtworkForm from './ArtworkForm';

interface Artwork {
  id: number;
  title: string;
  artist: string;
  year_created: string;
  medium: string;
  dimensions: string;
  current_location: string;
  price_paid: number | null;
  date_acquired: string;
  notes: string;
  image_path: string;
  created_at: string;
  updated_at: string;
}

export default function ArtworkDetail({ artwork }: { artwork: Artwork }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${artwork.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/artworks/${artwork.id}`, { method: 'DELETE' });
    router.push('/collection');
    router.refresh();
  }

  if (editing) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setEditing(false)} className="text-stone-400 hover:text-stone-600 text-sm">← Back</button>
          <h1 className="text-2xl font-bold text-stone-800">Edit Artwork</h1>
        </div>
        <ArtworkForm initial={artwork} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/collection" className="text-stone-400 hover:text-stone-600 text-sm">← Collection</Link>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {artwork.image_path && (
          <div className="w-full max-h-96 bg-stone-100 overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={artwork.image_path} alt={artwork.title} className="max-w-full max-h-96 object-contain" />
          </div>
        )}
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">{artwork.title}</h1>
              {artwork.artist && <p className="text-stone-500 mt-1">{artwork.artist}</p>}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors">Edit</button>
              <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4">
            {[
              { label: 'Year Created', value: artwork.year_created },
              { label: 'Medium', value: artwork.medium },
              { label: 'Dimensions', value: artwork.dimensions },
              { label: 'Current Location', value: artwork.current_location },
              { label: 'Price Paid', value: artwork.price_paid != null ? `$${artwork.price_paid.toLocaleString()}` : null },
              { label: 'Date Acquired', value: artwork.date_acquired },
            ].filter(({ value }) => value).map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs font-medium text-stone-400 uppercase tracking-wide">{label}</dt>
                <dd className="text-sm text-stone-700 mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>

          {artwork.notes && (
            <div>
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{artwork.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
