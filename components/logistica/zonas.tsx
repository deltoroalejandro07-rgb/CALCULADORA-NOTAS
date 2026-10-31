"use client";

import { MapPinned, Pencil, Plus, Trash2 } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { borrarZona, guardarAjustesPlan, guardarZona, type EstadoForm } from "@/app/(app)/logistica/acciones-planificar";
import { Tarjeta } from "@/components/app/piezas";
import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/cn";
import { DIAS_SEMANA } from "@/lib/dominio/destinos";

const campo = "mt-1 min-h-12 w-full rounded-lg border border-borde bg-superficie px-3 outline-none focus:border-marca";

interface Zona {
  id: string;
  nombre: string;
  dias: number[];
  vehiculo_id: string | null;
  color: string | null;
  clientes: number;
}

function enviar(accion: (f: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => accion(datos));
  };
}

function Formulario({ z, vehiculos, alTerminar }: { z: Zona | null; vehiculos: { id: string; nombre: string }[]; alTerminar: () => void }) {
  const [dias, setDias] = useState<number[]>(z?.dias ?? []);
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(async (previo, datos) => {
    const r = await guardarZona(previo, datos);
    if (r.ok) alTerminar();
    return r;
  }, {});
  return (
    <form onSubmit={enviar(accion)} className="space-y-3">
      {z && <input type="hidden" name="id" value={z.id} />}
      <label className="block text-sm font-medium">
        Nombre de la zona
        <input name="nombre" defaultValue={z?.nombre ?? ""} placeholder="Valencia Norte, Aldaia…" className={campo} />
      </label>
      <div>
        <p className="text-sm font-medium">Días de reparto</p>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {DIAS_SEMANA.map((d) => (
            <label key={d.n} className={cn("flex min-h-11 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold", dias.includes(d.n) ? "border-marca bg-marca-suave" : "border-borde")}>
              <input type="checkbox" name="dia" value={d.n} checked={dias.includes(d.n)} onChange={() => setDias((x) => (x.includes(d.n) ? x.filter((y) => y !== d.n) : [...x, d.n]))} className="sr-only" aria-label={d.largo} />
              {d.corto}
            </label>
          ))}
        </div>
      </div>
      <label className="block text-sm font-medium">
        Vehículo habitual (opcional)
        <select name="vehiculo_id" defaultValue={z?.vehiculo_id ?? ""} className={campo}>
          <option value="">Cualquiera</option>
          {vehiculos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre}
            </option>
          ))}
        </select>
      </label>
      {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
      <div className="flex gap-2">
        <Boton type="submit" cargando={pendiente} className="flex-1">
          Guardar zona
        </Boton>
        <Boton type="button" variante="secundario" onClick={alTerminar}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}

export function Zonas({ zonas, vehiculos }: { zonas: Zona[]; vehiculos: { id: string; nombre: string }[] }) {
  const [editando, setEditando] = useState<string | null>(zonas.length ? null : "nueva");
  const nombreDias = (d: number[]) =>
    d.length ? DIAS_SEMANA.filter((x) => d.includes(x.n)).map((x) => x.largo).join(", ") : "Sin días asignados";

  return (
    <section className="space-y-2">
      <p className="text-sm text-suave">
        Al planificar un día, la app junta los albaranes de las zonas que tocan ese día. La zona de cada cliente sale del campo «Ruta» del albarán de Holded, o se asigna aquí al revisar.
      </p>
      {zonas.map((z) =>
        editando === z.id ? (
          <Tarjeta key={z.id}>
            <Formulario z={z} vehiculos={vehiculos} alTerminar={() => setEditando(null)} />
          </Tarjeta>
        ) : (
          <Tarjeta key={z.id}>
            <div className="flex items-start gap-3">
              <MapPinned className="mt-0.5 h-6 w-6 shrink-0 text-marca" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{z.nombre}</p>
                <p className="text-sm text-suave">
                  {nombreDias(z.dias)} · {z.clientes} cliente{z.clientes === 1 ? "" : "s"}
                  {z.vehiculo_id && ` · ${vehiculos.find((v) => v.id === z.vehiculo_id)?.nombre ?? ""}`}
                </p>
              </div>
              <button type="button" onClick={() => setEditando(z.id)} aria-label={`Editar ${z.nombre}`} className="rounded-full p-2 text-suave active:bg-fondo">
                <Pencil className="h-5 w-5" />
              </button>
              <form
                action={borrarZona}
                onSubmit={(e) => {
                  if (!confirm(`¿Quitar la zona ${z.nombre}? Sus clientes quedan sin zona.`)) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={z.id} />
                <button type="submit" aria-label={`Quitar ${z.nombre}`} className="rounded-full p-2 text-red-600 active:bg-fondo">
                  <Trash2 className="h-5 w-5" />
                </button>
              </form>
            </div>
          </Tarjeta>
        ),
      )}
      {editando === "nueva" ? (
        <Tarjeta>
          <p className="mb-2 font-semibold">Nueva zona</p>
          <Formulario z={null} vehiculos={vehiculos} alTerminar={() => setEditando(null)} />
        </Tarjeta>
      ) : (
        <Boton type="button" variante="secundario" className="w-full" onClick={() => setEditando("nueva")}>
          <Plus className="h-5 w-5" aria-hidden /> Añadir zona
        </Boton>
      )}
    </section>
  );
}

export function AjustesPlan({ inicial }: { inicial: { minutos_descarga: number; hora_salida: string; volver_almacen: boolean } }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(guardarAjustesPlan, {});
  return (
    <Tarjeta>
      <form onSubmit={enviar(accion)} className="space-y-3">
        <p className="font-semibold">Al calcular las rutas</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            Hora de salida
            <input type="time" name="hora_salida" defaultValue={inicial.hora_salida.slice(0, 5)} className={campo} />
          </label>
          <label className="block text-sm font-medium">
            Minutos de descarga
            <input type="number" name="minutos_descarga" min={1} max={120} defaultValue={inicial.minutos_descarga} className={campo} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="volver_almacen" defaultChecked={inicial.volver_almacen} className="h-5 w-5 accent-[var(--marca)]" /> El vehículo vuelve al almacén al terminar
        </label>
        {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
        {estado.ok && <p className="text-sm text-emerald-700 dark:text-emerald-300">✓ {estado.ok}</p>}
        <Boton type="submit" variante="secundario" cargando={pendiente} className="w-full">
          Guardar ajustes
        </Boton>
      </form>
    </Tarjeta>
  );
}
