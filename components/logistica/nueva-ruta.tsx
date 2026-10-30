"use client";

import { Plus } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { crearRuta, type EstadoForm } from "@/app/(app)/logistica/acciones";
import { Tarjeta } from "@/components/app/piezas";
import { Boton } from "@/components/ui/boton";

const campo = "mt-1 min-h-12 w-full rounded-xl border border-borde bg-superficie px-3 outline-none focus:border-marca";

export function NuevaRuta({
  fecha,
  vehiculos,
  conductores,
}: {
  fecha: string;
  vehiculos: { id: string; nombre: string; matricula: string | null; conductor_habitual: string | null }[];
  conductores: { id: string; nombre: string }[];
}) {
  const [abierta, setAbierta] = useState(false);
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(crearRuta, {});
  const [vehiculo, setVehiculo] = useState(vehiculos[0]?.id ?? "");
  const [conductor, setConductor] = useState(vehiculos[0]?.conductor_habitual ?? "");

  if (!abierta) {
    return (
      <Boton type="button" className="w-full" onClick={() => setAbierta(true)}>
        <Plus className="h-5 w-5" aria-hidden /> Nueva ruta
      </Boton>
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
        <p className="font-semibold">Nueva ruta</p>
        <label className="block text-sm font-medium">
          Día
          <input type="date" name="fecha" defaultValue={fecha} required className={campo} />
        </label>
        <label className="block text-sm font-medium">
          Vehículo
          <select
            name="vehiculo_id"
            value={vehiculo}
            onChange={(e) => {
              setVehiculo(e.target.value);
              const habitual = vehiculos.find((v) => v.id === e.target.value)?.conductor_habitual;
              if (habitual) setConductor(habitual);
            }}
            className={campo}
          >
            <option value="">Sin vehículo</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
                {v.matricula ? ` · ${v.matricula}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Conductor
          <select name="conductor_id" value={conductor} onChange={(e) => setConductor(e.target.value)} className={campo}>
            <option value="">Elige quién conduce</option>
            {conductores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Notas para el conductor (opcional)
          <input name="notas" placeholder="Salida a las 7:30" className={campo} />
        </label>
        {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
        <div className="flex gap-2">
          <Boton type="submit" cargando={pendiente} className="flex-1">
            Crear y añadir paradas
          </Boton>
          <Boton type="button" variante="secundario" onClick={() => setAbierta(false)}>
            Cancelar
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}
