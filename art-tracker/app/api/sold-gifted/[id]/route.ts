import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare('SELECT * FROM sold_gifted WHERE id = ?').get(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  db.prepare(`
    UPDATE sold_gifted SET
      title = @title,
      description = @description,
      year_created = @year_created,
      medium = @medium,
      dimensions = @dimensions,
      recipient_name = @recipient_name,
      recipient_contact = @recipient_contact,
      type = @type,
      price_received = @price_received,
      date = @date,
      notes = @notes,
      image_path = @image_path,
      updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id: Number(id),
    title: body.title || '',
    description: body.description || null,
    year_created: body.year_created || null,
    medium: body.medium || null,
    dimensions: body.dimensions || null,
    recipient_name: body.recipient_name || '',
    recipient_contact: body.recipient_contact || null,
    type: body.type || 'gifted',
    price_received: body.price_received != null && body.price_received !== '' ? Number(body.price_received) : null,
    date: body.date || null,
    notes: body.notes || null,
    image_path: body.image_path || null,
  });
  const row = db.prepare('SELECT * FROM sold_gifted WHERE id = ?').get(Number(id));
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM sold_gifted WHERE id = ?').run(Number(id));
  return NextResponse.json({ success: true });
}
