"use client";

import { CalendarCheck, CalendarClock, CalendarDays, Menu, Plus, Truck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ENLACES = [
  { href: "/hoy", texto: "Hoy", icono: CalendarCheck },
  { href: "/clientes", texto: "Clientes", icono: Users },
  { href: "/visita/nueva", texto: "Visita", icono: Plus, central: true },
  { href: "/agenda", texto: "Agenda", icono: CalendarClock },
  { href: "/mas", texto: "Más", icono: Menu },
];

const ENLACES_REPARTIDOR = [
  { href: "/reparto", texto: "Mi reparto", icono: Truck },
  { href: "/reparto/dias", texto: "Historial", icono: CalendarDays },
  { href: "/mas", texto: "Más", icono: Menu },
];

export function BarraInferior({ repartidor }: { repartidor?: boolean }) {
  return <Barra ruta={usePathname()} repartidor={repartidor} />;
}

/** Sin ruta (mientras carga una página con parámetros) no marca ninguna pestaña. */
export function Barra({ ruta, repartidor }: { ruta: string | null; repartidor?: boolean }) {
  const enlaces: { href: string; texto: string; icono: typeof Menu; central?: boolean }[] = repartidor ? ENLACES_REPARTIDOR : ENLACES;
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-superficie/95 backdrop-blur lg:hidden">
      <ul className={cn("mx-auto grid max-w-lg", repartidor ? "grid-cols-3" : "grid-cols-5")}>
        {enlaces.map(({ href, texto, icono: Icono, central }) => {
          const activo = !!ruta && (ruta === href || (ruta.startsWith(href + "/") && !enlaces.some((e) => e.href !== href && e.href.startsWith(href) && ruta.startsWith(e.href))));
          return (
            <li key={href} className="flex justify-center">
              {central ? (
                <Link
                  href={href}
                  aria-label="Registrar visita"
                  className="-mt-5 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-marca text-marca-texto shadow-lg shadow-marca/30 ring-4 ring-fondo active:scale-95"
                >
                  <Icono className="h-7 w-7" strokeWidth={2.5} />
                </Link>
              ) : (
                <Link
                  href={href}
                  className={cn(
                    "flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium",
                    activo ? "text-marca" : "text-suave",
                  )}
                  aria-current={activo ? "page" : undefined}
                >
                  <Icono className="h-6 w-6" strokeWidth={activo ? 2.5 : 2} />
                  {texto}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
