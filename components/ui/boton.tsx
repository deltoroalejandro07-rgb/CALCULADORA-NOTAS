import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "principal" | "secundario" | "peligro";
  cargando?: boolean;
}

const VARIANTES = {
  principal: "bg-marca text-marca-texto shadow-sm hover:brightness-110",
  secundario: "border border-borde bg-superficie text-texto shadow-sm hover:bg-fondo",
  peligro: "bg-red-600 text-white hover:bg-red-700",
};

export function Boton({ variante = "principal", cargando, disabled, className, children, ...resto }: Props) {
  return (
    <button
      disabled={disabled || cargando}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-base font-semibold transition active:scale-[0.98] disabled:opacity-60 lg:min-h-10 lg:px-4 lg:text-sm",
        VARIANTES[variante],
        className,
      )}
      {...resto}
    >
      {cargando && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
