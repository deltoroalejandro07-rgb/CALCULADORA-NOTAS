import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CRM dliverygo",
    short_name: "dliverygo",
    description: "Ventas y reparto: visitas, clientes, rutas y entregas.",
    lang: "es-ES",
    start_url: "/hoy",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f9",
    theme_color: "#2f7d77",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Nueva visita", url: "/visita/nueva", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Clientes", url: "/clientes", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
