import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = await getDb();
  const result = await db.execute('SELECT * FROM artworks ORDER BY created_at DESC');
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO artworks (title, artist, year_created, medium, dimensions, current_location, quantity, price_paid, date_acquired, notes, image_path)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ],
  });
  const row = await db.execute({ sql: 'SELECT * FROM artworks WHERE id = ?', args: [Number(result.lastInsertRowid)] });
  return NextResponse.json(row.rows[0], { status: 201 });
}
