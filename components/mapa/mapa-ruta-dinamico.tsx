"use client";

import dynamic from "next/dynamic";

// Leaflet usa `window`: solo en el navegador
export const MapaRutaDinamico = dynamic(() => import("./mapa-ruta"), {
  ssr: false,
  loading: () => <div className="h-[40vh] animate-pulse rounded-2xl bg-borde/60" />,
});
