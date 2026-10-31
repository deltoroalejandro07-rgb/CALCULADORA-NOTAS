"use client";

import { LocateFixed, Trash2 } from "lucide-react";
import { startTransition, useActionState, useRef, useState } from "react";
import { borrarCliente, guardarCliente, type EstadoFormulario } from "@/app/(app)/clientes/acciones";
import { FotoCliente } from "@/components/ia/foto-cliente";
import { Boton } from "@/components/ui/boton";
import type { DatosFotoCliente } from "@/lib/ia/ia";
import type { DatosCliente } from "@/lib/dominio/cliente";
import { ESTADOS_CLIENTE, TEXTO_ESTADO, TEXTO_TIPO_NEGOCIO, TIPOS_NEGOCIO, type EstadoCliente } from "@/lib/dominio/tipos";

const campo = "mt-1 min-h-12 w-full rounded-lg border border-borde bg-superficie px-3 outline-none focus:border-marca focus:ring-2 focus:ring-marca/30";

function Campo({
  nombre,
  etiqueta,
  valor,
  error,
  ...resto
}: { nombre: string; etiqueta: string; valor?: string | number | null; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-medium">
      {etiqueta}
      <input name={nombre} defaultValue={valor ?? ""} className={campo} aria-invalid={!!error} {...resto} />
      {error && <span className="mt-0.5 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-borde bg-superficie p-4">
      <legend className="px-1 text-[13px] font-semibold text-suave">{titulo}</legend>
      {children}
    </fieldset>
  );
}

export function FormularioCliente({
  inicial,
  comerciales,
  esAdmin,
}: {
  inicial: DatosCliente;
  comerciales: { id: string; nombre: string }[];
  esAdmin: boolean;
}) {
  const [estado, accion, pendiente] = useActionState<EstadoFormulario, FormData>(guardarCliente, {});
  const [estadoCliente, setEstadoCliente] = useState<EstadoCliente>(inicial.estado);
  const [coords, setCoords] = useState({ lat: inicial.lat, lng: inicial.lng });
  const [gps, setGps] = useState<string | null>(null);
  const e = estado.campos ?? {};
  const formulario = useRef<HTMLFormElement>(null);

  /** Rellena los campos con lo leído de la foto (sin borrar lo que ya hubiera si no se leyó nada). */
  function rellenarDesdeFoto(d: DatosFotoCliente) {
    const f = formulario.current;
    if (!f) return;
    for (const [k, v] of Object.entries(d)) {
      if (!v) continue;
      const el = f.elements.namedItem(k);
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) el.value = String(v);
    }
  }

  function usarUbicacion() {
    setGps("Buscando…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) });
        setGps(`Guardada (±${Math.round(p.coords.accuracy)} m)`);
      },
      () => setGps("No se ha podido obtener la ubicación"),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  return (
    <>
      <form
        ref={formulario}
        // Envío manual: con `action={...}` React vacía el formulario tras un error de validación y se pierde lo escrito
        onSubmit={(ev) => {
          ev.preventDefault();
          const datos = new FormData(ev.currentTarget);
          startTransition(() => accion(datos));
        }}
        className="space-y-4 px-4 pb-8"
      >
        {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
        {!inicial.id && <FotoCliente onDatos={rellenarDesdeFoto} />}
        <input type="hidden" name="lat" value={coords.lat ?? ""} />
        <input type="hidden" name="lng" value={coords.lng ?? ""} />

        <Grupo titulo="Negocio">
          <Campo nombre="nombre_negocio" etiqueta="Nombre del negocio *" valor={inicial.nombre_negocio} error={e.nombre_negocio} required autoCapitalize="words" />
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Tipo
              <select name="tipo" defaultValue={inicial.tipo} className={campo}>
                {TIPOS_NEGOCIO.map((t) => (
                  <option key={t} value={t}>
                    {TEXTO_TIPO_NEGOCIO[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Estado
              <select name="estado" value={estadoCliente} onChange={(ev) => setEstadoCliente(ev.target.value as EstadoCliente)} className={campo}>
                {ESTADOS_CLIENTE.map((s) => (
                  <option key={s} value={s}>
                    {TEXTO_ESTADO[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {estadoCliente === "perdido" && <Campo nombre="motivo_perdida" etiqueta="¿Por qué se ha perdido? *" valor={inicial.motivo_perdida} error={e.motivo_perdida} required />}
          <div className="grid grid-cols-2 gap-3">
            <Campo nombre="proveedor_actual" etiqueta="Proveedor actual" valor={inicial.proveedor_actual} />
            <Campo nombre="volumen_estimado_eur" etiqueta="Volumen (€/mes)" valor={inicial.volumen_estimado_eur} inputMode="decimal" error={e.volumen_estimado_eur} />
          </div>
          <Campo nombre="etiquetas" etiqueta="Etiquetas (separadas por comas)" valor={inicial.etiquetas.join(", ")} placeholder="terraza, cocina abierta" />
          {esAdmin && (
            <label className="block text-sm font-medium">
              Comercial asignado
              <select name="comercial_id" defaultValue={inicial.comercial_id ?? ""} className={campo}>
                <option value="">Sin asignar</option>
                {comerciales.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
        </Grupo>

        <Grupo titulo="Contacto">
          <div className="grid grid-cols-2 gap-3">
            <Campo nombre="contacto_nombre" etiqueta="Persona" valor={inicial.contacto_nombre} autoCapitalize="words" />
            <Campo nombre="contacto_cargo" etiqueta="Cargo" valor={inicial.contacto_cargo} placeholder="Dueño, encargado…" />
          </div>
          <Campo nombre="telefono" etiqueta="Teléfono" valor={inicial.telefono} type="tel" inputMode="tel" />
          <Campo nombre="email" etiqueta="Email" valor={inicial.email} type="email" inputMode="email" error={e.email} />
          <Campo nombre="horario_visita" etiqueta="Mejor hora para visitar" valor={inicial.horario_visita} placeholder="L-V 16:00-18:00" />
        </Grupo>

        <Grupo titulo="Ubicación">
          <Campo nombre="direccion" etiqueta="Dirección" valor={inicial.direccion} />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Campo nombre="localidad" etiqueta="Localidad" valor={inicial.localidad} />
            </div>
            <Campo nombre="codigo_postal" etiqueta="C. P." valor={inicial.codigo_postal} inputMode="numeric" />
          </div>
          <Campo nombre="zona" etiqueta="Zona o barrio" valor={inicial.zona} />
          <div className="flex items-center gap-3">
            <Boton type="button" variante="secundario" onClick={usarUbicacion}>
              <LocateFixed className="h-5 w-5" aria-hidden /> Usar mi ubicación
            </Boton>
            <span className="text-xs text-suave">{gps ?? (coords.lat != null ? `${coords.lat}, ${coords.lng}` : "Sin coordenadas")}</span>
          </div>
        </Grupo>

        <Grupo titulo="Seguimiento">
          <Campo nombre="proxima_accion" etiqueta="Próxima acción" valor={inicial.proxima_accion} />
          <Campo nombre="proxima_accion_fecha" etiqueta="Fecha" valor={inicial.proxima_accion_fecha} type="date" />
          <label className="block text-sm font-medium">
            Notas
            <textarea name="notas" defaultValue={inicial.notas ?? ""} rows={4} className={`${campo} py-2`} />
          </label>
        </Grupo>

        {estado.error && (
          <p role="alert" className="text-center text-sm font-medium text-red-600">
            {estado.error}
          </p>
        )}
        <Boton type="submit" cargando={pendiente} className="w-full text-lg">
          {inicial.id ? "Guardar cambios" : "Crear cliente"}
        </Boton>
      </form>

      {esAdmin && inicial.id && (
        <form
          action={borrarCliente}
          onSubmit={(ev) => {
            if (!confirm(`¿Borrar «${inicial.nombre_negocio}» y TODO su historial (visitas, fotos, mensajes, pedidos)? No se puede deshacer.`)) ev.preventDefault();
          }}
          className="mx-4 mb-8 rounded-xl border border-red-300 p-4 dark:border-red-900"
        >
          <input type="hidden" name="id" value={inicial.id} />
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">Zona peligrosa</p>
          <p className="mb-3 text-xs text-suave">Derecho de supresión (RGPD): borra el cliente y todos sus datos. Exporta antes sus datos si te los ha pedido.</p>
          <Boton type="submit" variante="peligro" className="w-full">
            <Trash2 className="h-5 w-5" aria-hidden /> Borrar cliente y sus datos
          </Boton>
        </form>
      )}
    </>
  );
}
