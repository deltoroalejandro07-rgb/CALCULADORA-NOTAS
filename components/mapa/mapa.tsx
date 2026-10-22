"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import type { EstadoCliente } from "@/lib/dominio/tipos";
import { TEXTO_ESTADO } from "@/lib/dominio/tipos";

export interface PuntoMapa {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  estado: EstadoCliente;
  detalle?: string;
}

const COLOR: Record<EstadoCliente, string> = {
  prospecto: "#64748b",
  interesado: "#f59e0b",
  cliente: "#10b981",
  perdido: "#ef4444",
};

const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

interface Props {
  puntos: PuntoMapa[];
  /** Numera los puntos y los une en orden (ruta del día). */
  ruta?: boolean;
  yo?: { lat: number; lng: number } | null;
  alto?: string;
}

/**
 * Leaflet manejado a mano: cada vez que el efecto se ejecuta crea su propio contenedor
 * y lo destruye al limpiar. Next 16 oculta y vuelve a mostrar pantallas (<Activity>)
 * repitiendo los efectos, y así el mapa nunca reutiliza un contenedor ya usado.
 */
export default function Mapa({ puntos, ruta, yo, alto = "60vh" }: Props) {
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!caja.current) return;
    const div = document.createElement("div");
    div.style.height = "100%";
    div.style.width = "100%";
    caja.current.appendChild(div);

    const mapa = L.map(div, { zoomControl: true, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapa);

    const coords: L.LatLngTuple[] = puntos.map((p) => [p.lat, p.lng]);
    const miPos: L.LatLngTuple[] = yo ? [[yo.lat, yo.lng]] : [];
    if (yo) {
      L.circleMarker([yo.lat, yo.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).bindTooltip("Estás aquí").addTo(mapa);
    }
    if (ruta && puntos.length > 1) {
      L.polyline([...miPos, ...coords], { color: "#2f7d77", dashArray: "6 8", weight: 3 }).addTo(mapa);
    }
    puntos.forEach((p, i) => {
      const m = L.circleMarker([p.lat, p.lng], { radius: ruta ? 13 : 9, color: "#fff", weight: 2, fillColor: COLOR[p.estado], fillOpacity: 0.95 })
        .bindPopup(
          `<strong>${escapar(p.nombre)}</strong><br>${TEXTO_ESTADO[p.estado]}${p.detalle ? ` · ${escapar(p.detalle)}` : ""}<br><a href="/clientes/${p.id}">Ver ficha →</a>`,
        )
        .addTo(mapa);
      if (ruta) m.bindTooltip(String(i + 1), { permanent: true, direction: "center", className: "numero-ruta" });
    });

    const todos = [...coords, ...miPos];
    if (todos.length === 1) mapa.setView(todos[0], 15);
    else if (todos.length > 1) mapa.fitBounds(L.latLngBounds(todos), { padding: [30, 30] });
    else mapa.setView([40.4168, -3.7038], 12);

    return () => {
      mapa.remove();
      div.remove();
    };
  }, [puntos, ruta, yo]);

  return <div ref={caja} className="isolate overflow-hidden rounded-2xl border border-borde" style={{ height: alto }} />;
}
