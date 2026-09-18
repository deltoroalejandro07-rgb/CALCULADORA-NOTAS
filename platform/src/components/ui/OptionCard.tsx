import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface OptionCardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function OptionCard({
  className,
  selected,
  title,
  description,
  icon,
  ...props
}: OptionCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={clsx(
        "flex items-start gap-3 w-full text-left p-4 rounded-card border bg-surface transition-colors min-h-11",
        selected
          ? "border-accent-blue bg-accent-blue/10"
          : "border-line hover:border-line-cool",
        className,
      )}
      {...props}
    >
      {icon && <span className="text-primary shrink-0 mt-0.5">{icon}</span>}
      <span className="flex flex-col gap-1">
        <span className="font-medium text-primary">{title}</span>
        {description && (
          <span className="text-sm text-secondary">{description}</span>
        )}
      </span>
    </button>
  );
}
