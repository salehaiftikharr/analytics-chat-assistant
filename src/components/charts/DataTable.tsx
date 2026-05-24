import type { Row } from "./chart-common";

interface DataTableProps {
  rows: Row[];
  title?: string;
}

/** Fallback rendering for results that aren't chartable (chartSpec.type "none"). */
export default function DataTable({ rows, title }: DataTableProps) {
  if (rows.length === 0) {
    return <p className="chart-empty">No rows returned.</p>;
  }
  const columns = Object.keys(rows[0]);

  return (
    <figure className="data-table-wrap">
      {title ? <figcaption className="chart-title">{title}</figcaption> : null}
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c}>{String(row[c] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
