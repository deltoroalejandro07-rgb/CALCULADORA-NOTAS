import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera } from "@/components/app/piezas";
import { PanelReparto } from "@/components/reparto/panel-reparto";

export const metadata: Metadata = { title: "Mi reparto" };

// Página estática sin datos del usuario: la ruta se lee del propio móvil (IndexedDB),
// así el service worker puede servirla sin cobertura.
export default function PaginaReparto() {
  return (
    <>
      <Cabecera titulo="Mi reparto" />
      <Suspense>
        <PanelReparto />
      </Suspense>
    </>
  );
}
