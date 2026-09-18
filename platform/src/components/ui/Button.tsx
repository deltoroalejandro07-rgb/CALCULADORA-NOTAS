import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex items-center justify-center gap-2 min-h-11 px-6 rounded-pill font-medium text-sm transition-opacity disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "gradient-cta text-base font-semibold hover:opacity-90",
  secondary:
    "bg-surface border border-line text-primary hover:border-line-cool",
  ghost: "text-secondary hover:text-primary",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(base, variants[variant], className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";
