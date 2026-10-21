import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera } from "@/components/app/piezas";
import { FormularioVisita } from "@/components/visita/formulario-visita";

export const metadata: Metadata = { title: "Nueva visita" };

// Página estática sin datos del usuario: los lee del propio móvil (IndexedDB),
// así el service worker puede servirla sin cobertura.
export default function PaginaNuevaVisita() {
  return (
    <>
      <Cabecera titulo="Nueva visita" />
      <Suspense>
        <FormularioVisita />
      </Suspense>
    </>
  );
}
