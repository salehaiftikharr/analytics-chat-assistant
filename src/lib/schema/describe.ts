import { readOnlyPool } from "@/lib/db";

/**
 * Produces a human-readable description of the analytics tables for the LLM.
 *
 * It introspects the live database THROUGH THE READ-ONLY POOL, so:
 *  - the description always reflects the real schema (types, nullability,
 *    primary/foreign keys, and the COMMENTs from db/init), and
 *  - it only ever lists tables the read-only role can actually query. The
 *    `messages` table is invisible here because that role has no access to it,
 *    so the LLM is never told it exists.
 */

interface TableRow {
  table_name: string;
  table_comment: string | null;
}

interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  not_null: boolean;
  column_comment: string | null;
}

interface PkRow {
  table_name: string;
  column_name: string;
}

interface FkRow {
  table_name: string;
  column_name: string;
  ref_table: string;
  ref_column: string;
}

// The schema is fixed for the app's lifetime, so cache the rendered text.
let cached: string | null = null;

export async function describeSchema(refresh = false): Promise<string> {
  if (cached && !refresh) return cached;

  const [tables, columns, pks, fks] = await Promise.all([
    readOnlyPool.query<TableRow>(`
      SELECT c.relname AS table_name, obj_description(c.oid) AS table_comment
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND has_table_privilege(c.oid, 'SELECT')
      ORDER BY c.relname
    `),
    readOnlyPool.query<ColumnRow>(`
      SELECT c.relname                              AS table_name,
             a.attname                              AS column_name,
             format_type(a.atttypid, a.atttypmod)   AS data_type,
             a.attnotnull                           AS not_null,
             col_description(a.attrelid, a.attnum)  AS column_comment
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND has_table_privilege(c.oid, 'SELECT')
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY c.relname, a.attnum
    `),
    readOnlyPool.query<PkRow>(`
      SELECT c.relname AS table_name, a.attname AS column_name
      FROM pg_index i
      JOIN pg_class c     ON c.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
      WHERE i.indisprimary
        AND n.nspname = 'public'
        AND has_table_privilege(c.oid, 'SELECT')
    `),
    readOnlyPool.query<FkRow>(`
      SELECT con.conrelid::regclass::text  AS table_name,
             att.attname                   AS column_name,
             con.confrelid::regclass::text AS ref_table,
             att2.attname                  AS ref_column
      FROM pg_constraint con
      CROSS JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS k(conkey, confkey, ord)
      JOIN pg_attribute att  ON att.attrelid  = con.conrelid  AND att.attnum  = k.conkey
      JOIN pg_attribute att2 ON att2.attrelid = con.confrelid AND att2.attnum = k.confkey
      WHERE con.contype = 'f'
        AND con.connamespace = 'public'::regnamespace
        AND has_table_privilege(con.conrelid, 'SELECT')
      ORDER BY table_name, ord
    `),
  ]);

  // Index the metadata for quick lookup while rendering.
  const pkSet = new Set(pks.rows.map((r) => `${r.table_name}.${r.column_name}`));
  const fkMap = new Map<string, FkRow>();
  for (const fk of fks.rows) fkMap.set(`${fk.table_name}.${fk.column_name}`, fk);

  const columnsByTable = new Map<string, ColumnRow[]>();
  for (const col of columns.rows) {
    const list = columnsByTable.get(col.table_name) ?? [];
    list.push(col);
    columnsByTable.set(col.table_name, list);
  }

  const blocks = tables.rows.map((table) => {
    const header = table.table_comment
      ? `Table "${table.table_name}" — ${table.table_comment}`
      : `Table "${table.table_name}"`;

    const lines = (columnsByTable.get(table.table_name) ?? []).map((col) => {
      const key = `${table.table_name}.${col.column_name}`;
      const attrs = [col.data_type];
      if (pkSet.has(key)) attrs.push("primary key");
      if (col.not_null) attrs.push("not null");

      let line = `  - ${col.column_name} (${attrs.join(", ")})`;

      const fk = fkMap.get(key);
      if (fk) line += ` → references ${fk.ref_table}(${fk.ref_column})`;
      if (col.column_comment) line += ` — ${col.column_comment}`;
      return line;
    });

    return [header, ...lines].join("\n");
  });

  cached = blocks.join("\n\n");
  return cached;
}
