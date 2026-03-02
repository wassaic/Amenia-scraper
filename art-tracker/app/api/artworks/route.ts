import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM artworks ORDER BY created_at DESC
  `).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO artworks (title, artist, year_created, medium, dimensions, current_location, price_paid, date_acquired, notes, image_path)
    VALUES (@title, @artist, @year_created, @medium, @dimensions, @current_location, @price_paid, @date_acquired, @notes, @image_path)
  `);
  const result = stmt.run({
    title: body.title || '',
    artist: body.artist || null,
    year_created: body.year_created || null,
    medium: body.medium || null,
    dimensions: body.dimensions || null,
    current_location: body.current_location || null,
    price_paid: body.price_paid != null ? Number(body.price_paid) : null,
    date_acquired: body.date_acquired || null,
    notes: body.notes || null,
    image_path: body.image_path || null,
  });
  const row = db.prepare('SELECT * FROM artworks WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}
