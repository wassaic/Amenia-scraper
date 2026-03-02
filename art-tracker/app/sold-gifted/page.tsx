import Link from 'next/link';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface SoldGiftedRecord {
  id: number;
  title: string;
  recipient_name: string;
  type: 'sold' | 'gifted';
  price_received: number | null;
  date: string;
  medium: string;
  image_path: string;
}

export default function SoldGiftedPage() {
  const db = getDb();
  const records = db.prepare('SELECT * FROM sold_gifted ORDER BY created_at DESC').all() as SoldGiftedRecord[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Sold & Gifted</h1>
          <p className="text-stone-500 text-sm mt-0.5">Artwork you&apos;ve sold or given away</p>
        </div>
        <Link href="/sold-gifted/new" className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors">
          + Add Record
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-sm">No records yet. Track artwork you&apos;ve sold or gifted.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => (
            <Link key={r.id} href={`/sold-gifted/${r.id}`} className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md hover:border-amber-300 transition-all">
              <div className="aspect-video bg-stone-100 overflow-hidden flex items-center justify-center">
                {r.image_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image_path} alt={r.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-stone-300 text-4xl">🖼</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-stone-800 truncate">{r.title}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${r.type === 'sold' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {r.type}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1 truncate">To: {r.recipient_name}</p>
                {r.price_received != null && r.type === 'sold' && (
                  <p className="text-xs text-stone-400 mt-1">${r.price_received.toLocaleString()}</p>
                )}
                {r.date && <p className="text-xs text-stone-400 mt-1">{r.date}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
