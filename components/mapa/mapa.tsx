"use client";

import "leaflet/dist/leaflet.css";
import { latLngBounds } from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
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

function Encuadre({ puntos, yo }: { puntos: PuntoMapa[]; yo?: { lat: number; lng: number } | null }) {
  const mapa = useMap();
  useEffect(() => {
    const coords: [number, number][] = puntos.map((p) => [p.lat, p.lng]);
    if (yo) coords.push([yo.lat, yo.lng]);
    if (coords.length === 1) mapa.setView(coords[0], 15);
    else if (coords.length > 1) mapa.fitBounds(latLngBounds(coords), { padding: [30, 30] });
  }, [mapa, puntos, yo]);
  return null;
}

interface Props {
  puntos: PuntoMapa[];
  /** Numera los puntos y los une en orden (ruta del día). */
  ruta?: boolean;
  yo?: { lat: number; lng: number } | null;
  alto?: string;
}

export default function Mapa({ puntos, ruta, yo, alto = "60vh" }: Props) {
  const centro: [number, number] = puntos[0] ? [puntos[0].lat, puntos[0].lng] : yo ? [yo.lat, yo.lng] : [40.4168, -3.7038];
  return (
    <div className="isolate overflow-hidden rounded-2xl border border-borde" style={{ height: alto }}>
      <MapContainer center={centro} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Encuadre puntos={puntos} yo={yo} />
        {ruta && puntos.length > 1 && (
          <Polyline positions={[...(yo ? [[yo.lat, yo.lng] as [number, number]] : []), ...puntos.map((p) => [p.lat, p.lng] as [number, number])]} pathOptions={{ color: "#0f766e", dashArray: "6 8", weight: 3 }} />
        )}
        {yo && (
          <CircleMarker center={[yo.lat, yo.lng]} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}>
            <Tooltip>Estás aquí</Tooltip>
          </CircleMarker>
        )}
        {puntos.map((p, i) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={ruta ? 13 : 9}
            pathOptions={{ color: "#fff", weight: 2, fillColor: COLOR[p.estado], fillOpacity: 0.95 }}
          >
            {ruta && (
              <Tooltip permanent direction="center" className="numero-ruta">
                {i + 1}
              </Tooltip>
            )}
            <Popup>
              <strong>{p.nombre}</strong>
              <br />
              {TEXTO_ESTADO[p.estado]}
              {p.detalle ? ` · ${p.detalle}` : ""}
              <br />
              <Link href={`/clientes/${p.id}`}>Ver ficha →</Link>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
