import { cn } from "@/lib/cn";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  activo?: boolean;
  tono?: "marca" | "interes";
}

export function Chip({ activo, tono = "marca", className, children, ...resto }: Props) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition active:scale-95",
        !activo && "border-borde bg-superficie text-texto",
        activo && tono === "marca" && "border-marca bg-marca-suave text-texto",
        activo && tono === "interes" && "border-orange-500 bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100",
        className,
      )}
      {...resto}
    >
      {children}
    </button>
  );
}
