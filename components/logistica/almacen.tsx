"use client";

import { LocateFixed, Warehouse } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { guardarAlmacen, type EstadoForm } from "@/app/(app)/logistica/acciones";
import { Tarjeta } from "@/components/app/piezas";
import { Boton } from "@/components/ui/boton";

const campo = "mt-1 min-h-12 w-full rounded-lg border border-borde bg-superficie px-3 outline-none focus:border-marca";

export function Almacen({ inicial }: { inicial: { almacen_direccion: string | null; almacen_lat: number | null; almacen_lng: number | null } }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(guardarAlmacen, {});
  const [lat, setLat] = useState(inicial.almacen_lat?.toString() ?? "");
  const [lng, setLng] = useState(inicial.almacen_lng?.toString() ?? "");
  const [gps, setGps] = useState<string | null>(null);

  function usarMiUbicacion() {
    setGps("Buscando…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(6));
        setLng(p.coords.longitude.toFixed(6));
        setGps(`Ubicación tomada (±${Math.round(p.coords.accuracy)} m). Pulsa Guardar.`);
      },
      () => setGps("No se ha podido obtener la ubicación (desde el ordenador es normal). Escribe la dirección y pulsa Guardar: la buscamos en el mapa."),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  return (
    <Tarjeta>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const datos = new FormData(e.currentTarget);
          startTransition(() => accion(datos));
        }}
        className="space-y-3"
      >
        <p className="flex items-center gap-2 font-semibold">
          <Warehouse className="h-5 w-5 text-marca" aria-hidden /> Almacén
        </p>
        <p className="text-sm text-suave">Punto de salida de las rutas: desde aquí se ordenan las paradas por cercanía.</p>
        <label className="block text-sm font-medium">
          Dirección
          <input
            name="almacen_direccion"
            defaultValue={inicial.almacen_direccion ?? ""}
            placeholder="Calle, número, localidad"
            onChange={() => {
              // Dirección nueva: al guardar se busca en el mapa (salvo que luego se use el GPS)
              setLat("");
              setLng("");
              setGps(null);
            }}
            className={campo}
          />
        </label>
        <input type="hidden" name="almacen_lat" value={lat} />
        <input type="hidden" name="almacen_lng" value={lng} />
        <Boton type="button" variante="secundario" className="w-full" onClick={usarMiUbicacion}>
          <LocateFixed className="h-5 w-5" aria-hidden /> Estoy en el almacén: usar mi ubicación
        </Boton>
        <p className="text-xs text-suave">{gps ?? (lat && lng ? `Ubicación guardada: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : "Escribe la dirección y pulsa Guardar, o usa tu ubicación si estás en el almacén.")}</p>
        {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
        {estado.ok && <p className="text-sm text-emerald-700 dark:text-emerald-300">✓ {estado.ok}</p>}
        <Boton type="submit" cargando={pendiente} className="w-full">
          Guardar almacén
        </Boton>
      </form>
    </Tarjeta>
  );
}
