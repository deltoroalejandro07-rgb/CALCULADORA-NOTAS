"use client";

import {
  BarChart3,
  CalendarClock,
  CalendarCheck,
  CalendarDays,
  FileSpreadsheet,
  MapPinned,
  MessageCircle,
  Plus,
  Route,
  Settings,
  Sparkles,
  Truck,
  UserCog,
  Users,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type Enlace = { href: string; texto: string; icono: typeof Users; soloAdmin?: boolean };
type Grupo = { titulo: string; soloAdmin?: boolean; enlaces: Enlace[] };

const GRUPOS: Grupo[] = [
  {
    titulo: "Ventas",
    enlaces: [
      { href: "/hoy", texto: "Hoy", icono: CalendarCheck },
      { href: "/clientes", texto: "Clientes", icono: Users },
      { href: "/agenda", texto: "Agenda", icono: CalendarClock },
      { href: "/mensajes", texto: "Mensajes", icono: MessageCircle },
    ],
  },
  {
    titulo: "Reparto",
    enlaces: [
      { href: "/logistica", texto: "Preparar reparto", icono: Route, soloAdmin: true },
      { href: "/reparto", texto: "Mi reparto", icono: Truck },
      { href: "/reparto/dias", texto: "Historial de rutas", icono: CalendarDays },
    ],
  },
  {
    titulo: "Dirección",
    soloAdmin: true,
    enlaces: [
      { href: "/direccion", texto: "Informes", icono: BarChart3 },
      { href: "/asistente", texto: "Pregúntale a tu CRM", icono: Sparkles },
    ],
  },
  {
    titulo: "Ajustes",
    soloAdmin: true,
    enlaces: [
      { href: "/logistica/zonas", texto: "Zonas de reparto", icono: MapPinned },
      { href: "/logistica/vehiculos", texto: "Vehículos y almacén", icono: Warehouse },
      { href: "/ajustes/usuarios", texto: "Usuarios", icono: UserCog },
      { href: "/ajustes/importar", texto: "Importar / exportar", icono: FileSpreadsheet },
    ],
  },
];

const TODOS = GRUPOS.flatMap((g) => g.enlaces.map((e) => e.href)).concat("/mas");

/** El enlace que más se parece a la ruta actual (así «Albaranes» no enciende también «Rutas del día»). */
function enlaceActivo(ruta: string | null) {
  if (!ruta) return null;
  return TODOS.filter((h) => ruta === h || ruta.startsWith(h + "/")).sort((a, b) => b.length - a.length)[0] ?? null;
}

export interface UsuarioMenu {
  nombre: string;
  rol: "admin" | "comercial";
}

export function MenuLateral({ usuario }: { usuario: UsuarioMenu | null }) {
  return <Menu ruta={usePathname()} usuario={usuario} />;
}

/** Menú fijo a la izquierda, solo en pantallas grandes (en el móvil está la barra inferior). */
export function Menu({ ruta, usuario }: { ruta: string | null; usuario: UsuarioMenu | null }) {
  const activo = enlaceActivo(ruta);
  const esAdmin = usuario?.rol === "admin";
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-borde bg-superficie lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/hoy" aria-label="Inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="dliverygo" width={318} height={103} className="h-7 w-auto" />
        </Link>
      </div>
      <div className="px-3 pb-2">
        <Link
          href="/visita/nueva"
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-marca text-sm font-semibold text-marca-texto shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden /> Nueva visita
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Menú principal">
        {GRUPOS.filter((g) => !g.soloAdmin || esAdmin).map((g) => (
          <div key={g.titulo} className="mb-4">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-suave/80">{g.titulo}</p>
            <ul className="space-y-0.5">
              {g.enlaces.filter((e) => !e.soloAdmin || esAdmin).map(({ href, texto, icono: Icono }) => {
                const es = activo === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={es ? "page" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-2.5 rounded-lg px-2 text-sm transition",
                        es ? "bg-marca-suave font-semibold text-marca" : "text-texto/80 hover:bg-fondo hover:text-texto",
                      )}
                    >
                      <Icono className={cn("h-4 w-4 shrink-0", es ? "text-marca" : "text-suave")} aria-hidden />
                      {texto}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-borde p-3">
        <Link
          href="/mas"
          aria-current={activo === "/mas" ? "page" : undefined}
          className={cn("flex items-center gap-3 rounded-lg p-2 transition hover:bg-fondo", activo === "/mas" && "bg-fondo")}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marca-suave text-sm font-semibold text-marca">
            {usuario?.nombre.trim().charAt(0).toUpperCase() ?? "·"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{usuario?.nombre ?? "Mi cuenta"}</span>
            <span className="block text-xs text-suave">{usuario ? (esAdmin ? "Administrador" : "Comercial") : " "}</span>
          </span>
          <Settings className="h-4 w-4 text-suave" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
