import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const result = await db.execute({ sql: 'SELECT * FROM sold_gifted WHERE id = ?', args: [Number(id)] });
  if (!result.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = await getDb();
  await db.execute({
    sql: `UPDATE sold_gifted SET
      title = ?, description = ?, year_created = ?, medium = ?, dimensions = ?,
      recipient_name = ?, recipient_contact = ?, type = ?, price_received = ?,
      date = ?, notes = ?, image_path = ?, updated_at = datetime('now')
    WHERE id = ?`,
    args: [
      body.title || '',
      body.description || null,
      body.year_created || null,
      body.medium || null,
      body.dimensions || null,
      body.recipient_name || '',
      body.recipient_contact || null,
      body.type || 'gifted',
      body.price_received != null && body.price_received !== '' ? Number(body.price_received) : null,
      body.date || null,
      body.notes || null,
      body.image_path || null,
      Number(id),
    ],
  });
  const row = await db.execute({ sql: 'SELECT * FROM sold_gifted WHERE id = ?', args: [Number(id)] });
  return NextResponse.json(row.rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM sold_gifted WHERE id = ?', args: [Number(id)] });
  return NextResponse.json({ success: true });
}
