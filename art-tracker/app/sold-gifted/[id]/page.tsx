import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import SoldGiftedDetail from '@/components/SoldGiftedDetail';

export const dynamic = 'force-dynamic';

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

export default async function SoldGiftedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const result = await db.execute({ sql: 'SELECT * FROM sold_gifted WHERE id = ?', args: [Number(id)] });
  const record = result.rows[0] as unknown as SoldGiftedRecord | undefined;
  if (!record) notFound();

  return <SoldGiftedDetail record={record} />;
}
