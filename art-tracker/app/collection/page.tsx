import Link from 'next/link';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface Artwork {
  id: number;
  title: string;
  artist: string;
  year_created: string;
  medium: string;
  current_location: string;
  price_paid: number | null;
  image_path: string;
}

export default function CollectionPage() {
  const db = getDb();
  const artworks = db.prepare('SELECT * FROM artworks ORDER BY created_at DESC').all() as Artwork[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Collection</h1>
          <p className="text-stone-500 text-sm mt-0.5">{artworks.length} {artworks.length === 1 ? 'artwork' : 'artworks'}</p>
        </div>
        <Link href="/collection/new" className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors">
          + Add Artwork
        </Link>
      </div>

      {artworks.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <p className="text-4xl mb-3">🖼</p>
          <p className="text-sm">No artworks yet. Add your first one!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {artworks.map((a) => (
            <Link key={a.id} href={`/collection/${a.id}`} className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md hover:border-amber-300 transition-all">
              <div className="aspect-video bg-stone-100 overflow-hidden flex items-center justify-center">
                {a.image_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image_path} alt={a.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-stone-300 text-4xl">🖼</span>
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold text-stone-800 truncate">{a.title}</p>
                <p className="text-xs text-stone-500 mt-1 truncate">
                  {[a.artist, a.year_created, a.medium].filter(Boolean).join(' · ')}
                </p>
                {a.current_location && (
                  <p className="text-xs text-amber-600 mt-1 truncate">📍 {a.current_location}</p>
                )}
                {a.price_paid != null && (
                  <p className="text-xs text-stone-400 mt-1">${a.price_paid.toLocaleString()}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
