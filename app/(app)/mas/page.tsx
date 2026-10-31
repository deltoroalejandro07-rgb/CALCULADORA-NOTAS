import { BarChart3, CalendarClock, CalendarDays, ChevronRight, FileSpreadsheet, MapPinned, MessageCircle, Route, Sparkles, Truck, UserCog, Warehouse } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando, Tarjeta } from "@/components/app/piezas";
import { usuarioActual } from "@/lib/auth";
import { CambiarContrasena, CerrarSesion, SelectorTema } from "./controles";

export const metadata: Metadata = { title: "Más" };

export default function PaginaMas() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const usuario = await usuarioActual();
  const esAdmin = usuario.rol === "admin";

  const grupos = [
    {
      titulo: "Ventas",
      items: [
        { texto: "Agenda: reuniones y notas", icono: CalendarClock, href: "/agenda" },
        { texto: "Mensajes y campañas", icono: MessageCircle, href: "/mensajes" },
      ],
    },
    {
      titulo: "Reparto",
      items: [
        ...(esAdmin ? [{ texto: "Preparar reparto", icono: Route, href: "/logistica" }] : []),
        { texto: "Mi reparto", icono: Truck, href: "/reparto" },
        { texto: "Historial de rutas", icono: CalendarDays, href: "/reparto/dias" },
      ],
    },
    ...(esAdmin
      ? [
          {
            titulo: "Dirección",
            items: [
              { texto: "Informes", icono: BarChart3, href: "/direccion" },
              { texto: "Pregúntale a tu CRM (IA)", icono: Sparkles, href: "/asistente" },
            ],
          },
          {
            titulo: "Ajustes",
            items: [
              { texto: "Zonas de reparto", icono: MapPinned, href: "/logistica/zonas" },
              { texto: "Vehículos y almacén", icono: Warehouse, href: "/logistica/vehiculos" },
              { texto: "Usuarios", icono: UserCog, href: "/ajustes/usuarios" },
              { texto: "Importar / exportar clientes", icono: FileSpreadsheet, href: "/ajustes/importar" },
            ],
          },
        ]
      : []),
  ];


  return (
    <>
      <Cabecera titulo="Más" />
      <div className="space-y-4 px-4">
        <Tarjeta>
          <p className="font-semibold">{usuario.nombre}</p>
          <p className="text-sm text-suave">
            {usuario.email} · {esAdmin ? "Administrador" : "Comercial"}
          </p>
          <div className="mt-3">
            <CambiarContrasena />
          </div>
        </Tarjeta>

        {grupos.map((g) => (
          <section key={g.titulo}>
            <h2 className="mb-1.5 px-1 text-[13px] font-semibold text-suave">{g.titulo}</h2>
            <ul className="divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-superficie">
              {g.items.map(({ texto, icono: Icono, href }) => (
                <li key={href}>
                  <Link href={href} className="flex min-h-13 items-center gap-3 px-4 py-3 active:bg-fondo">
                    <Icono className="h-5 w-5 text-marca" aria-hidden />
                    <span className="flex-1">{texto}</span>
                    <ChevronRight className="h-5 w-5 text-suave" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <Tarjeta>
          <p className="mb-2 text-sm font-medium">Apariencia</p>
          <SelectorTema />
        </Tarjeta>

        <CerrarSesion />
      </div>
    </>
  );
}
