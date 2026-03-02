import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import ArtworkDetail from '@/components/ArtworkDetail';

export const dynamic = 'force-dynamic';

interface Artwork {
  id: number;
  title: string;
  artist: string;
  year_created: string;
  medium: string;
  dimensions: string;
  current_location: string;
  quantity: number;
  price_paid: number | null;
  date_acquired: string;
  notes: string;
  image_path: string;
  created_at: string;
  updated_at: string;
}

export default async function ArtworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const result = await db.execute({ sql: 'SELECT * FROM artworks WHERE id = ?', args: [Number(id)] });
  const artwork = result.rows[0] as unknown as Artwork | undefined;
  if (!artwork) notFound();

  return <ArtworkDetail artwork={artwork} />;
}
