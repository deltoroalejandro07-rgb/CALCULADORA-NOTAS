import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { FormularioCliente } from "@/components/clientes/formulario-cliente";
import { usuarioActual } from "@/lib/auth";
import { CLIENTE_VACIO } from "@/lib/dominio/cliente";
import { listaComerciales } from "@/lib/datos/comerciales";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default function PaginaNuevoCliente() {
  return (
    <>
      <Cabecera titulo="Nuevo cliente" subtitulo="Para registrar una visita a la vez, usa el botón +" />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  const usuario = await usuarioActual();
  const esAdmin = usuario.rol === "admin";
  const comerciales = esAdmin ? await listaComerciales() : [];
  return <FormularioCliente inicial={{ ...CLIENTE_VACIO, comercial_id: usuario.id }} comerciales={comerciales} esAdmin={esAdmin} />;
}
