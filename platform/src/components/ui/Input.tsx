import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={clsx(
      "w-full min-h-11 px-4 rounded-xl bg-surface border border-line text-primary placeholder:text-secondary",
      "focus:outline-none focus:border-accent-blue",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";
