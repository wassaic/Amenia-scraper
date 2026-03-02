import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = await getDb();
  const result = await db.execute('SELECT * FROM sold_gifted ORDER BY created_at DESC');
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO sold_gifted (title, description, year_created, medium, dimensions, recipient_name, recipient_contact, type, price_received, date, notes, image_path)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ],
  });
  const row = await db.execute({ sql: 'SELECT * FROM sold_gifted WHERE id = ?', args: [Number(result.lastInsertRowid)] });
  return NextResponse.json(row.rows[0], { status: 201 });
}
