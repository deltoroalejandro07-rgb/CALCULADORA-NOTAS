"use client";

import dynamic from "next/dynamic";

// Leaflet usa `window`: solo en el navegador
export const MapaDinamico = dynamic(() => import("./mapa"), {
  ssr: false,
  loading: () => <div className="h-[60vh] animate-pulse rounded-2xl bg-borde/60" />,
});
