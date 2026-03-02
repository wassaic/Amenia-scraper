import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const result = await db.execute({ sql: 'SELECT * FROM artworks WHERE id = ?', args: [Number(id)] });
  if (!result.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = await getDb();
  await db.execute({
    sql: `UPDATE artworks SET
      title = ?, artist = ?, year_created = ?, medium = ?, dimensions = ?,
      current_location = ?, quantity = ?, price_paid = ?, date_acquired = ?, notes = ?,
      image_path = ?, updated_at = datetime('now')
    WHERE id = ?`,
    args: [
      body.title || '',
      body.artist || null,
      body.year_created || null,
      body.medium || null,
      body.dimensions || null,
      body.current_location || null,
      body.quantity != null && body.quantity !== '' ? Math.max(1, parseInt(body.quantity)) : 1,
      body.price_paid != null && body.price_paid !== '' ? Number(body.price_paid) : null,
      body.date_acquired || null,
      body.notes || null,
      body.image_path || null,
      Number(id),
    ],
  });
  const row = await db.execute({ sql: 'SELECT * FROM artworks WHERE id = ?', args: [Number(id)] });
  return NextResponse.json(row.rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM artworks WHERE id = ?', args: [Number(id)] });
  return NextResponse.json({ success: true });
}
