interface StatCardProps {
  label: string;
  value: unknown;
}

/** A single headline number — used when a result is one row / one value. */
export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-value">{formatValue(value)}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function formatValue(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(n)) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value ?? "—");
}
