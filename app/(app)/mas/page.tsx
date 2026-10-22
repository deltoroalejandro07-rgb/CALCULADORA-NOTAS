import { BarChart3, ChevronRight, FileSpreadsheet, Package, Tag, UserCog } from "lucide-react";
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

  const secciones = [
    { texto: "Catálogo de productos", icono: Package, href: "/catalogo" },
    { texto: "Ofertas", icono: Tag, href: "/ofertas" },
    ...(esAdmin
      ? [
          { texto: "Panel de dirección", icono: BarChart3, href: "/direccion" },
          { texto: "Usuarios", icono: UserCog, href: "/ajustes/usuarios" },
          { texto: "Importar / exportar clientes", icono: FileSpreadsheet, href: "/ajustes/importar" },
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

        <ul className="divide-y divide-borde overflow-hidden rounded-2xl border border-borde bg-superficie">
          {secciones.map(({ texto, icono: Icono, href }) => (
            <li key={texto}>
              <Link href={href} className="flex min-h-14 items-center gap-3 px-4 active:bg-fondo">
                <Icono className="h-5 w-5 text-marca" aria-hidden />
                <span className="flex-1">{texto}</span>
                <ChevronRight className="h-5 w-5 text-suave" aria-hidden />
              </Link>
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
