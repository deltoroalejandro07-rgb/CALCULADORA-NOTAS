import { BarChart3, ChevronRight, FileSpreadsheet, Package, Tag, UserCog } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera, Cargando, Tarjeta } from "@/components/app/piezas";
import { usuarioActual } from "@/lib/auth";
import { CerrarSesion, SelectorTema } from "./controles";

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

  const secciones = [
    { texto: "Catálogo de productos", icono: Package, paso: 4 },
    { texto: "Ofertas", icono: Tag, paso: 4 },
    ...(esAdmin
      ? [
          { texto: "Panel de dirección", icono: BarChart3, paso: 6 },
          { texto: "Usuarios", icono: UserCog, paso: 0 },
          { texto: "Importar / exportar clientes", icono: FileSpreadsheet, paso: 7 },
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
        </Tarjeta>

        <ul className="divide-y divide-borde overflow-hidden rounded-2xl border border-borde bg-superficie">
          {secciones.map(({ texto, icono: Icono, paso }) => (
            <li key={texto} className="flex min-h-14 items-center gap-3 px-4 text-suave">
              <Icono className="h-5 w-5" aria-hidden />
              <span className="flex-1">{texto}</span>
              <span className="text-xs">{paso ? `Paso ${paso}` : "Pronto"}</span>
              <ChevronRight className="h-5 w-5" aria-hidden />
            </li>
          ))}
        </ul>

        <Tarjeta>
          <p className="mb-2 text-sm font-medium">Apariencia</p>
          <SelectorTema />
        </Tarjeta>

        <CerrarSesion />
      </div>
    </>
  );
}
