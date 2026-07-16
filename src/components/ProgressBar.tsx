export function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs text-[rgba(55,53,47,0.55)]">
        <span>
          Location {current} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(55,53,47,0.08)]">
        <div
          className="h-full rounded-full bg-[#2383e2] transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
