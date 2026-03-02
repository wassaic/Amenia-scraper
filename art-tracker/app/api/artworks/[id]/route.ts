import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare('SELECT * FROM artworks WHERE id = ?').get(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  db.prepare(`
    UPDATE artworks SET
      title = @title,
      artist = @artist,
      year_created = @year_created,
      medium = @medium,
      dimensions = @dimensions,
      current_location = @current_location,
      price_paid = @price_paid,
      date_acquired = @date_acquired,
      notes = @notes,
      image_path = @image_path,
      updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id: Number(id),
    title: body.title || '',
    artist: body.artist || null,
    year_created: body.year_created || null,
    medium: body.medium || null,
    dimensions: body.dimensions || null,
    current_location: body.current_location || null,
    price_paid: body.price_paid != null && body.price_paid !== '' ? Number(body.price_paid) : null,
    date_acquired: body.date_acquired || null,
    notes: body.notes || null,
    image_path: body.image_path || null,
  });
  const row = db.prepare('SELECT * FROM artworks WHERE id = ?').get(Number(id));
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM artworks WHERE id = ?').run(Number(id));
  return NextResponse.json({ success: true });
}
