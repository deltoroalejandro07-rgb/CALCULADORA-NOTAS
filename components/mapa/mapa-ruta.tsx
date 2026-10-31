"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

export interface PuntoRuta {
  lat: number;
  lng: number;
  nombre: string;
  detalle?: string;
  aviso?: boolean;
}

const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Mapa de una ruta de reparto: almacén, paradas numeradas en orden y vuelta. */
export default function MapaRuta({ almacen, puntos, color = "#2f7d77", alto = "40vh" }: { almacen: { lat: number; lng: number } | null; puntos: PuntoRuta[]; color?: string; alto?: string }) {
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!caja.current) return;
    const div = document.createElement("div");
    div.style.height = "100%";
    caja.current.appendChild(div);
    const mapa = L.map(div);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapa);

    const coords: L.LatLngTuple[] = puntos.map((p) => [p.lat, p.lng]);
    const todos: L.LatLngTuple[] = [...(almacen ? [[almacen.lat, almacen.lng] as L.LatLngTuple] : []), ...coords];
    if (almacen) {
      L.marker([almacen.lat, almacen.lng], {
        icon: L.divIcon({ className: "", html: '<div style="background:#111827;color:#fff;border-radius:6px;padding:2px 6px;font:700 11px system-ui">Almacén</div>', iconAnchor: [28, 10] }),
      }).addTo(mapa);
    }
    if (todos.length > 1) L.polyline(almacen ? [...todos, [almacen.lat, almacen.lng]] : todos, { color, weight: 3, dashArray: "6 8" }).addTo(mapa);
    puntos.forEach((p, i) => {
      L.circleMarker([p.lat, p.lng], { radius: 13, color: "#fff", weight: 2, fillColor: p.aviso ? "#dc2626" : color, fillOpacity: 0.95 })
        .bindPopup(`<strong>${i + 1}. ${escapar(p.nombre)}</strong>${p.detalle ? `<br>${escapar(p.detalle)}` : ""}`)
        .bindTooltip(String(i + 1), { permanent: true, direction: "center", className: "numero-ruta" })
        .addTo(mapa);
    });
    if (todos.length === 1) mapa.setView(todos[0], 14);
    else if (todos.length > 1) mapa.fitBounds(L.latLngBounds(todos), { padding: [30, 30] });
    else mapa.setView([39.47, -0.38], 11);

    return () => {
      mapa.remove();
      div.remove();
    };
  }, [almacen, puntos, color]);

  return <div ref={caja} className="isolate overflow-hidden rounded-2xl border border-borde" style={{ height: alto }} />;
}
