import Link from 'next/link';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const db = getDb();
  const artworkCount = (db.prepare('SELECT COUNT(*) as c FROM artworks').get() as { c: number }).c;
  const soldGiftedCount = (db.prepare('SELECT COUNT(*) as c FROM sold_gifted').get() as { c: number }).c;
  const soldCount = (db.prepare("SELECT COUNT(*) as c FROM sold_gifted WHERE type = 'sold'").get() as { c: number }).c;
  const giftedCount = (db.prepare("SELECT COUNT(*) as c FROM sold_gifted WHERE type = 'gifted'").get() as { c: number }).c;
  const recentArtworks = db.prepare('SELECT * FROM artworks ORDER BY created_at DESC LIMIT 5').all() as Array<{ id: number; title: string; artist: string; current_location: string; image_path: string }>;
  const recentSoldGifted = db.prepare('SELECT * FROM sold_gifted ORDER BY created_at DESC LIMIT 5').all() as Array<{ id: number; title: string; recipient_name: string; type: string; image_path: string }>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-stone-800 mb-1">Family Art Collection</h1>
        <p className="text-stone-500 text-sm">Track your art collection and artwork you&apos;ve sold or gifted.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Works in Collection', value: artworkCount, href: '/collection', color: 'bg-amber-50 border-amber-200' },
          { label: 'Sold & Gifted Total', value: soldGiftedCount, href: '/sold-gifted', color: 'bg-stone-100 border-stone-200' },
          { label: 'Sold', value: soldCount, href: '/sold-gifted', color: 'bg-green-50 border-green-200' },
          { label: 'Gifted', value: giftedCount, href: '/sold-gifted', color: 'bg-blue-50 border-blue-200' },
        ].map(({ label, value, href, color }) => (
          <Link key={label} href={href} className={`rounded-lg border p-4 ${color} hover:shadow-sm transition-shadow`}>
            <p className="text-3xl font-bold text-stone-800">{value}</p>
            <p className="text-xs text-stone-500 mt-1">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-8">
        {/* Recent collection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-stone-700">Recent Collection</h2>
            <Link href="/collection" className="text-xs text-amber-600 hover:underline">View all</Link>
          </div>
          {recentArtworks.length === 0 ? (
            <p className="text-stone-400 text-sm">No artworks yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentArtworks.map((a) => (
                <li key={a.id}>
                  <Link href={`/collection/${a.id}`} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-stone-200 hover:border-amber-300 transition-colors">
                    <div className="w-10 h-10 rounded bg-stone-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {a.image_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.image_path} alt={a.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-stone-300 text-lg">🖼</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{a.title}</p>
                      <p className="text-xs text-stone-400 truncate">{a.artist || 'Unknown artist'}{a.current_location ? ` · ${a.current_location}` : ''}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/collection/new" className="mt-3 inline-block text-xs text-amber-600 hover:underline">+ Add artwork</Link>
        </div>

        {/* Recent sold/gifted */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-stone-700">Recent Sold & Gifted</h2>
            <Link href="/sold-gifted" className="text-xs text-amber-600 hover:underline">View all</Link>
          </div>
          {recentSoldGifted.length === 0 ? (
            <p className="text-stone-400 text-sm">No records yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentSoldGifted.map((r) => (
                <li key={r.id}>
                  <Link href={`/sold-gifted/${r.id}`} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-stone-200 hover:border-amber-300 transition-colors">
                    <div className="w-10 h-10 rounded bg-stone-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {r.image_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image_path} alt={r.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-stone-300 text-lg">🖼</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{r.title}</p>
                      <p className="text-xs text-stone-400 truncate">
                        <span className={`capitalize font-medium ${r.type === 'sold' ? 'text-green-600' : 'text-blue-600'}`}>{r.type}</span>
                        {' · '}{r.recipient_name}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/sold-gifted/new" className="mt-3 inline-block text-xs text-amber-600 hover:underline">+ Add record</Link>
        </div>
      </div>
    </div>
  );
}
