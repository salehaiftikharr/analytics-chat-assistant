import { NextResponse } from "next/server";
import { readOnlyQuery, appPool } from "@/lib/db";

/**
 * TEMPORARY verification route for step 3. Proves both pools work:
 *  - reads seed analytics data via the read-only pool, and
 *  - inserts + reads back a message via the app pool (then cleans it up).
 * Remove once the real /api/chat route lands.
 */
export async function GET() {
  try {
    // (1) Read seed data through the read-only pool.
    const categories = await readOnlyQuery<{ category: string; revenue: number }>(
      `SELECT p.category,
              round(sum(oi.quantity * oi.unit_price), 2)::float8 AS revenue
       FROM order_items oi
       JOIN products p ON p.product_id = oi.product_id
       GROUP BY p.category
       ORDER BY revenue DESC`,
    );

    // (2) Round-trip a message through the app pool, then delete it so the
    //     verification leaves no trace.
    const conversationId = crypto.randomUUID();
    const inserted = await appPool.query(
      `INSERT INTO messages (conversation_id, role, content)
       VALUES ($1, 'user', $2)
       RETURNING id, role, content, created_at`,
      [conversationId, "db-check ping"],
    );
    const readBack = await appPool.query(
      `SELECT id, role, content FROM messages WHERE conversation_id = $1`,
      [conversationId],
    );
    await appPool.query(`DELETE FROM messages WHERE conversation_id = $1`, [
      conversationId,
    ]);

    return NextResponse.json({
      ok: true,
      readOnlyPool: { rowCount: categories.length, categories },
      appPool: {
        inserted: inserted.rows[0],
        readBackCount: readBack.rows.length,
        cleanedUp: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
