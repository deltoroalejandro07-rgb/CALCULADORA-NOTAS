import { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-primary">{label}</span>
      {children}
      {hint && <span className="text-xs text-secondary">{hint}</span>}
    </label>
  );
}
