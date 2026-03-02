import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM sold_gifted ORDER BY created_at DESC
  `).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO sold_gifted (title, description, year_created, medium, dimensions, recipient_name, recipient_contact, type, price_received, date, notes, image_path)
    VALUES (@title, @description, @year_created, @medium, @dimensions, @recipient_name, @recipient_contact, @type, @price_received, @date, @notes, @image_path)
  `);
  const result = stmt.run({
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
  const row = db.prepare('SELECT * FROM sold_gifted WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}
