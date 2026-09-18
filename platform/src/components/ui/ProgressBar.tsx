export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="h-1.5 w-full rounded-pill bg-surface border border-line overflow-hidden">
      <div
        className="gradient-progress h-full rounded-pill transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
