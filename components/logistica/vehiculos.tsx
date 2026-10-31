"use client";

import { Pencil, Plus, Truck } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { guardarVehiculo, type EstadoForm } from "@/app/(app)/logistica/acciones";
import { Tarjeta } from "@/components/app/piezas";
import { Boton } from "@/components/ui/boton";
import { ETIQUETAS_AMBIENTALES, TEXTO_ETIQUETA } from "@/lib/dominio/reparto";

const campo = "mt-1 min-h-12 w-full rounded-lg border border-borde bg-superficie px-3 outline-none focus:border-marca";

interface Vehiculo {
  id: string;
  nombre: string;
  matricula: string | null;
  capacidad_kg: number | null;
  capacidad_bultos: number | null;
  etiqueta_ambiental: string | null;
  conductor_habitual: string | null;
  activo: boolean;
  notas: string | null;
}

function Formulario({ v, conductores, alTerminar }: { v: Vehiculo | null; conductores: { id: string; nombre: string }[]; alTerminar: () => void }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(async (previo, datos) => {
    const r = await guardarVehiculo(previo, datos);
    if (r.ok) alTerminar();
    return r;
  }, {});
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => accion(datos));
      }}
      className="space-y-3"
    >
      {v && <input type="hidden" name="id" value={v.id} />}
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Nombre
          <input name="nombre" defaultValue={v?.nombre ?? ""} placeholder="Furgoneta 1" className={campo} />
        </label>
        <label className="block text-sm font-medium">
          Matrícula
          <input name="matricula" defaultValue={v?.matricula ?? ""} placeholder="1234ABC" className={campo} />
        </label>
        <label className="block text-sm font-medium">
          Carga máx. (kg)
          <input name="capacidad_kg" inputMode="decimal" defaultValue={v?.capacidad_kg ?? ""} className={campo} />
        </label>
        <label className="block text-sm font-medium">
          Bultos máx.
          <input name="capacidad_bultos" inputMode="numeric" defaultValue={v?.capacidad_bultos ?? ""} className={campo} />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Etiqueta ambiental (zonas de bajas emisiones)
        <select name="etiqueta_ambiental" defaultValue={v?.etiqueta_ambiental ?? ""} className={campo}>
          <option value="">Sin indicar</option>
          {ETIQUETAS_AMBIENTALES.map((e) => (
            <option key={e} value={e}>
              {TEXTO_ETIQUETA[e]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Conductor habitual
        <select name="conductor_habitual" defaultValue={v?.conductor_habitual ?? ""} className={campo}>
          <option value="">Ninguno</option>
          {conductores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Notas
        <input name="notas" defaultValue={v?.notas ?? ""} placeholder="ITV en marzo, plataforma elevadora…" className={campo} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="activo" defaultChecked={v?.activo ?? true} className="h-5 w-5 accent-[var(--marca)]" /> En uso
      </label>
      {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
      <div className="flex gap-2">
        <Boton type="submit" cargando={pendiente} className="flex-1">
          Guardar
        </Boton>
        <Boton type="button" variante="secundario" onClick={alTerminar}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}

export function Vehiculos({ vehiculos, conductores }: { vehiculos: Vehiculo[]; conductores: { id: string; nombre: string }[] }) {
  const [editando, setEditando] = useState<string | "nuevo" | null>(null);
  const nombreConductor = (id: string | null) => conductores.find((c) => c.id === id)?.nombre;

  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-semibold text-suave">Vehículos</h2>
      {vehiculos.map((v) =>
        editando === v.id ? (
          <Tarjeta key={v.id}>
            <Formulario v={v} conductores={conductores} alTerminar={() => setEditando(null)} />
          </Tarjeta>
        ) : (
          <Tarjeta key={v.id} className={v.activo ? "" : "opacity-60"}>
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 h-6 w-6 shrink-0 text-marca" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {v.nombre}
                  {v.matricula && <span className="font-normal text-suave"> · {v.matricula}</span>}
                  {!v.activo && <span className="ml-2 text-xs font-normal text-suave">(fuera de uso)</span>}
                </p>
                <p className="text-sm text-suave">
                  {[
                    v.capacidad_kg != null && `${v.capacidad_kg.toLocaleString("es-ES")} kg`,
                    v.capacidad_bultos != null && `${v.capacidad_bultos} bultos`,
                    v.etiqueta_ambiental && `Etiqueta ${TEXTO_ETIQUETA[v.etiqueta_ambiental as keyof typeof TEXTO_ETIQUETA] ?? v.etiqueta_ambiental}`,
                    nombreConductor(v.conductor_habitual) && `Conduce ${nombreConductor(v.conductor_habitual)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sin datos de carga"}
                </p>
              </div>
              <button type="button" onClick={() => setEditando(v.id)} aria-label={`Editar ${v.nombre}`} className="rounded-full p-2 text-suave active:bg-fondo">
                <Pencil className="h-5 w-5" />
              </button>
            </div>
          </Tarjeta>
        ),
      )}
      {editando === "nuevo" ? (
        <Tarjeta>
          <p className="mb-2 font-semibold">Nuevo vehículo</p>
          <Formulario v={null} conductores={conductores} alTerminar={() => setEditando(null)} />
        </Tarjeta>
      ) : (
        <Boton type="button" variante="secundario" className="w-full" onClick={() => setEditando("nuevo")}>
          <Plus className="h-5 w-5" aria-hidden /> Añadir vehículo
        </Boton>
      )}
    </section>
  );
}
