import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({ className, selected, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={clsx(
        "min-h-11 px-4 rounded-pill border text-sm font-medium transition-colors",
        selected
          ? "border-accent-blue bg-accent-blue/10 text-primary"
          : "border-line bg-surface text-secondary hover:text-primary",
        className,
      )}
      {...props}
    />
  );
}
