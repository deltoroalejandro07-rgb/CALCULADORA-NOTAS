"use client";

import { Trash2, Users } from "lucide-react";
import { startTransition, useActionState, useMemo, useState } from "react";
import { borrarOferta, guardarOferta, type EstadoForm } from "@/app/(app)/catalogo/acciones";
import { Boton } from "@/components/ui/boton";
import { Chip } from "@/components/ui/chip";
import { ofertaEncaja, type PerfilCliente } from "@/lib/dominio/segmentos";
import { ESTADOS_CLIENTE, TEXTO_ESTADO, TEXTO_TIPO_NEGOCIO, TIPOS_NEGOCIO, type EstadoCliente, type TipoNegocio } from "@/lib/dominio/tipos";
import { fechaDentroDe } from "@/lib/dominio/visita";

interface Oferta {
  id: string;
  titulo: string;
  descripcion: string | null;
  condicion: string | null;
  descuento_pct: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  activa: boolean;
  productos: string[];
  segmento_tipos: TipoNegocio[];
  segmento_zonas: string[];
  segmento_estados: EstadoCliente[];
  segmento_productos: string[];
}

const campo = "mt-1 min-h-12 w-full rounded-xl border border-borde bg-superficie px-3 outline-none focus:border-marca";
const alternar = <T,>(l: T[], v: T) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);

function Grupo({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium">{titulo}</p>
      {ayuda && <p className="text-xs text-suave">{ayuda}</p>}
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function FormularioOferta({
  inicial,
  productos,
  clientes,
  zonas,
}: {
  inicial: Oferta | null;
  productos: { id: string; nombre: string; formato: string | null }[];
  clientes: (PerfilCliente & { consiente_whatsapp: boolean })[];
  zonas: string[];
}) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(guardarOferta, {});
  const [incluidos, setIncluidos] = useState<string[]>(inicial?.productos ?? []);
  const [tipos, setTipos] = useState<TipoNegocio[]>(inicial?.segmento_tipos ?? []);
  const [zonasSel, setZonasSel] = useState<string[]>(inicial?.segmento_zonas ?? []);
  const [estados, setEstados] = useState<EstadoCliente[]>(inicial?.segmento_estados ?? []);
  const [porInteres, setPorInteres] = useState(!!inicial?.segmento_productos.length);
  const [inicio, setInicio] = useState(inicial?.fecha_inicio ?? fechaDentroDe(0));
  const [fin, setFin] = useState(inicial?.fecha_fin ?? fechaDentroDe(30));

  // Vista previa: a cuántos clientes llegaría (como si ya estuviera vigente)
  const segmentoProductos = useMemo(() => (porInteres ? incluidos : []), [porInteres, incluidos]);
  const encajan = useMemo(
    () =>
      clientes.filter((c) =>
        ofertaEncaja(
          { activa: true, fecha_inicio: "0000-01-01", fecha_fin: "9999-12-31", segmento_tipos: tipos, segmento_zonas: zonasSel, segmento_estados: estados, segmento_productos: segmentoProductos },
          c,
          fechaDentroDe(0),
        ),
      ),
    [clientes, tipos, zonasSel, estados, segmentoProductos],
  );

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          startTransition(() => accion(f));
        }}
        className="space-y-4 px-4 pb-8"
      >
        {inicial && <input type="hidden" name="id" value={inicial.id} />}
        <input type="hidden" name="productos" value={JSON.stringify(incluidos)} />
        <input type="hidden" name="segmento_tipos" value={JSON.stringify(tipos)} />
        <input type="hidden" name="segmento_zonas" value={JSON.stringify(zonasSel)} />
        <input type="hidden" name="segmento_estados" value={JSON.stringify(estados)} />
        <input type="hidden" name="segmento_productos" value={JSON.stringify(segmentoProductos)} />

        <fieldset className="space-y-3 rounded-2xl border border-borde bg-superficie p-4">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-suave">La oferta</legend>
          <label className="block text-sm font-medium">
            Título *
            <input name="titulo" required defaultValue={inicial?.titulo} placeholder="Arranque de barril" className={campo} />
          </label>
          <label className="block text-sm font-medium">
            Condición (lo que se lee primero)
            <input name="condicion" defaultValue={inicial?.condicion ?? ""} placeholder="3 barriles + 1 de regalo" className={campo} />
          </label>
          <label className="block text-sm font-medium">
            Descripción
            <textarea name="descripcion" rows={3} defaultValue={inicial?.descripcion ?? ""} className={`${campo} py-2`} />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm font-medium">
              Desde
              <input type="date" name="fecha_inicio" required value={inicio} onChange={(e) => setInicio(e.target.value)} className={campo} />
            </label>
            <label className="block text-sm font-medium">
              Hasta
              <input type="date" name="fecha_fin" required min={inicio} value={fin} onChange={(e) => setFin(e.target.value)} className={campo} />
            </label>
            <label className="block text-sm font-medium">
              Dto. %
              <input name="descuento_pct" inputMode="decimal" defaultValue={inicial?.descuento_pct ?? ""} className={campo} />
            </label>
          </div>
          <label className="flex min-h-11 items-center justify-between">
            <span className="font-medium">Activa</span>
            <input type="checkbox" name="activa" defaultChecked={inicial?.activa ?? true} className="h-6 w-6 accent-[var(--marca)]" />
          </label>
          <Grupo titulo="Productos incluidos">
            {productos.map((p) => (
              <Chip key={p.id} activo={incluidos.includes(p.id)} onClick={() => setIncluidos(alternar(incluidos, p.id))}>
                {p.nombre}
                {p.formato && <span className="text-xs opacity-70">{p.formato}</span>}
              </Chip>
            ))}
          </Grupo>
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl border border-borde bg-superficie p-4">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-suave">A quién va dirigida</legend>
          <p className="text-xs text-suave">Sin marcar nada en un grupo = todos.</p>
          <Grupo titulo="Tipo de negocio">
            {TIPOS_NEGOCIO.map((t) => (
              <Chip key={t} activo={tipos.includes(t)} onClick={() => setTipos(alternar(tipos, t))}>
                {TEXTO_TIPO_NEGOCIO[t]}
              </Chip>
            ))}
          </Grupo>
          {zonas.length > 0 && (
            <Grupo titulo="Zona">
              {zonas.map((z) => (
                <Chip key={z} activo={zonasSel.includes(z)} onClick={() => setZonasSel(alternar(zonasSel, z))}>
                  {z}
                </Chip>
              ))}
            </Grupo>
          )}
          <Grupo titulo="Estado">
            {ESTADOS_CLIENTE.map((e) => (
              <Chip key={e} activo={estados.includes(e)} onClick={() => setEstados(alternar(estados, e))}>
                {TEXTO_ESTADO[e]}
              </Chip>
            ))}
          </Grupo>
          <label className="flex min-h-11 items-center justify-between gap-3">
            <span>
              <span className="font-medium">Solo a interesados en estos productos</span>
              <span className="block text-xs text-suave">Clientes que marcaron «le interesa» alguno de los productos incluidos</span>
            </span>
            <input type="checkbox" checked={porInteres} onChange={(e) => setPorInteres(e.target.checked)} className="h-6 w-6 accent-[var(--marca)]" />
          </label>
          <p className="flex items-center gap-2 rounded-xl bg-marca-suave px-3 py-2 text-sm">
            <Users className="h-5 w-5" aria-hidden />
            <span>
              Llegaría a <strong>{encajan.length}</strong> clientes ({encajan.filter((c) => c.consiente_whatsapp).length} con WhatsApp autorizado)
            </span>
          </p>
        </fieldset>

        {estado.error && (
          <p role="alert" className="text-center text-sm text-red-600">
            {estado.error}
          </p>
        )}
        <Boton type="submit" cargando={pendiente} className="w-full">
          {inicial ? "Guardar cambios" : "Crear oferta"}
        </Boton>
      </form>
      {inicial && (
        <form
          action={borrarOferta}
          onSubmit={(e) => {
            if (!confirm("¿Borrar esta oferta? Los mensajes ya enviados se conservan.")) e.preventDefault();
          }}
          className="px-4 pb-8"
        >
          <input type="hidden" name="id" value={inicial.id} />
          <Boton type="submit" variante="secundario" className="w-full text-red-700 dark:text-red-300">
            <Trash2 className="h-5 w-5" aria-hidden /> Borrar oferta
          </Boton>
        </form>
      )}
    </>
  );
}
