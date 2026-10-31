"use client";

import { ChevronDown, ShieldOff } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { crearCampana } from "@/app/(app)/mensajes/acciones";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import type { OfertaMensaje, PlantillaMensaje } from "@/lib/datos/mensajeria";
import type { ClienteSegmento } from "@/lib/datos/segmento";
import { conBaja, rellenarPlantilla } from "@/lib/dominio/plantillas";
import { ofertaEncaja } from "@/lib/dominio/segmentos";
import { ESTADOS_CLIENTE, TEXTO_ESTADO, TEXTO_TIPO_NEGOCIO, TIPOS_NEGOCIO, type EstadoCliente, type TipoNegocio } from "@/lib/dominio/tipos";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { BotonEnviar } from "./boton-enviar";

type Canal = "whatsapp" | "email";
const alternar = <T,>(l: T[], v: T) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);

export function Campana({
  clientes,
  plantillas,
  ofertas,
  comercial,
  ofertaInicial,
  esAdmin,
}: {
  clientes: ClienteSegmento[];
  plantillas: PlantillaMensaje[];
  ofertas: OfertaMensaje[];
  comercial: string;
  ofertaInicial: string | null;
  esAdmin: boolean;
}) {
  const ofertaDe = (id: string | null) => ofertas.find((o) => o.id === id) ?? null;
  const inicial = ofertaDe(ofertaInicial);
  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [ofertaId, setOfertaId] = useState<string | null>(inicial?.id ?? null);
  const plantillaPara = (cn: Canal, conOferta: boolean) =>
    plantillas.filter((p) => p.canal === cn).find((p) => conOferta === /\{oferta\}/.test(p.cuerpo)) ?? plantillas.find((p) => p.canal === cn) ?? null;
  const [plantillaId, setPlantillaId] = useState<string | null>(plantillaPara("whatsapp", !!inicial)?.id ?? null);
  const [tipos, setTipos] = useState<TipoNegocio[]>(inicial?.segmento_tipos ?? []);
  const [zonas, setZonas] = useState<string[]>(inicial?.segmento_zonas ?? []);
  const [estados, setEstados] = useState<EstadoCliente[]>(inicial?.segmento_estados ?? []);
  const [soloInteresados, setSoloInteresados] = useState(!!inicial?.segmento_productos.length);
  const [verFiltros, setVerFiltros] = useState(!inicial);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const campanaId = useRef<string | null>(null);

  const oferta = ofertaDe(ofertaId);
  const plantilla = plantillas.find((p) => p.id === plantillaId) ?? null;
  const todasZonas = useMemo(() => [...new Set(clientes.map((c) => c.zona).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "es")), [clientes]);

  function cambiarOferta(id: string | null) {
    const o = ofertaDe(id);
    setOfertaId(id);
    setPlantillaId(plantillaPara(canal, !!o)?.id ?? plantillaId);
    if (o) {
      setTipos(o.segmento_tipos);
      setZonas(o.segmento_zonas);
      setEstados(o.segmento_estados);
      setSoloInteresados(!!o.segmento_productos.length);
    }
  }

  const segmento = useMemo(
    () =>
      clientes.filter((c) =>
        ofertaEncaja(
          {
            activa: true,
            fecha_inicio: "0000-01-01",
            fecha_fin: "9999-12-31",
            segmento_tipos: tipos,
            segmento_zonas: zonas,
            segmento_estados: estados,
            segmento_productos: soloInteresados && oferta ? oferta.segmento_productos : [],
          },
          c,
          fechaDentroDe(0),
        ),
      ),
    [clientes, tipos, zonas, estados, soloInteresados, oferta],
  );

  const conPermiso = segmento.filter((c) => (canal === "whatsapp" ? c.consiente_whatsapp && c.telefono : c.consiente_email && c.email));
  const sinPermiso = segmento.filter((c) => !conPermiso.includes(c));

  const textoPara = (c: ClienteSegmento) =>
    conBaja(rellenarPlantilla(plantilla?.cuerpo ?? "Hola {contacto}, soy {comercial}.", { contacto: c.contacto_nombre, negocio: c.nombre_negocio, comercial, oferta }), canal);
  const asuntoPara = (c: ClienteSegmento) =>
    plantilla?.asunto ? rellenarPlantilla(plantilla.asunto, { contacto: c.contacto_nombre, negocio: c.nombre_negocio, comercial, oferta }) : (oferta?.titulo ?? "Novedades");

  async function asegurarCampana() {
    campanaId.current ??= await crearCampana({
      nombre: `${oferta?.titulo ?? plantilla?.nombre ?? "Campaña"} · ${new Date().toLocaleDateString("es-ES")}`,
      canal,
      plantilla_id: plantillaId,
      oferta_id: ofertaId,
      filtro: { tipos, zonas, estados, soloInteresados },
    });
    return campanaId.current;
  }

  const select = "mt-1 min-h-12 w-full rounded-xl border border-borde bg-superficie px-3";

  return (
    <div className="space-y-4 px-4 pb-8">
      <div className="grid grid-cols-2 gap-2">
        {(["whatsapp", "email"] as Canal[]).map((cn) => (
          <Chip
            key={cn}
            activo={canal === cn}
            onClick={() => {
              setCanal(cn);
              setPlantillaId(plantillaPara(cn, !!oferta)?.id ?? null);
              campanaId.current = null;
            }}
            className="justify-center"
          >
            {cn === "whatsapp" ? "WhatsApp" : "Email"}
          </Chip>
        ))}
      </div>
      {ofertas.length > 0 && (
        <label className="block text-sm font-medium">
          Oferta
          <select value={ofertaId ?? ""} onChange={(e) => cambiarOferta(e.target.value || null)} className={select}>
            <option value="">Sin oferta (mensaje general)</option>
            {ofertas.map((o) => (
              <option key={o.id} value={o.id}>
                {o.titulo}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block text-sm font-medium">
        Plantilla
        <select value={plantillaId ?? ""} onChange={(e) => setPlantillaId(e.target.value || null)} className={select}>
          {plantillas
            .filter((p) => p.canal === canal)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          {!plantillas.some((p) => p.canal === canal) && <option value="">Saludo básico (no hay plantillas de {canal})</option>}
        </select>
      </label>

      <div className="rounded-2xl border border-borde bg-superficie">
        <button type="button" onClick={() => setVerFiltros((v) => !v)} aria-expanded={verFiltros} className="flex min-h-12 w-full items-center justify-between px-4 text-sm font-medium">
          A quién: {segmento.length} cliente{segmento.length === 1 ? "" : "s"}
          {esAdmin ? " (de todo el equipo)" : ""}
          <ChevronDown className={cn("h-5 w-5 transition", verFiltros && "rotate-180")} aria-hidden />
        </button>
        {verFiltros && (
          <div className="space-y-3 border-t border-borde p-4">
            <div className="flex flex-wrap gap-2">
              {TIPOS_NEGOCIO.map((t) => (
                <Chip key={t} activo={tipos.includes(t)} onClick={() => setTipos(alternar(tipos, t))}>
                  {TEXTO_TIPO_NEGOCIO[t]}
                </Chip>
              ))}
            </div>
            {todasZonas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {todasZonas.map((z) => (
                  <Chip key={z} activo={zonas.includes(z)} onClick={() => setZonas(alternar(zonas, z))}>
                    {z}
                  </Chip>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {ESTADOS_CLIENTE.map((e) => (
                <Chip key={e} activo={estados.includes(e)} onClick={() => setEstados(alternar(estados, e))}>
                  {TEXTO_ESTADO[e]}
                </Chip>
              ))}
            </div>
            {oferta && oferta.segmento_productos.length > 0 && (
              <label className="flex items-center justify-between gap-3 text-sm">
                Solo interesados en los productos de la oferta
                <input type="checkbox" checked={soloInteresados} onChange={(e) => setSoloInteresados(e.target.checked)} className="h-5 w-5 accent-[var(--marca)]" />
              </label>
            )}
          </div>
        )}
      </div>

      <p className="text-sm">
        <strong>{conPermiso.length}</strong> con permiso para {canal === "whatsapp" ? "WhatsApp" : "email"} · {enviados.size} enviado{enviados.size === 1 ? "" : "s"}
      </p>

      <ul className="space-y-2">
        {conPermiso.map((c) => {
          const texto = textoPara(c);
          return (
            <li key={c.id} className={cn("rounded-2xl border bg-superficie p-3", enviados.has(c.id) ? "border-emerald-400" : "border-borde")}>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setAbierto(abierto === c.id ? null : c.id)} className="min-w-0 flex-1 text-left" aria-expanded={abierto === c.id}>
                  <p className="truncate font-medium">{c.nombre_negocio}</p>
                  <p className="truncate text-xs text-suave">
                    {c.contacto_nombre ?? "Sin contacto"} · {canal === "whatsapp" ? c.telefono : c.email} · {abierto === c.id ? "ocultar" : "ver mensaje"}
                  </p>
                </button>
                <BotonEnviar
                  compacto
                  canal={canal}
                  destino={(canal === "whatsapp" ? c.telefono : c.email)!}
                  clienteId={c.id}
                  texto={texto}
                  asunto={canal === "email" ? asuntoPara(c) : null}
                  ofertaId={ofertaId}
                  plantillaId={plantillaId}
                  antes={asegurarCampana}
                  onEnviado={() => setEnviados((s) => new Set(s).add(c.id))}
                />
              </div>
              {abierto === c.id && <p className="mt-2 whitespace-pre-line rounded-xl bg-fondo p-3 text-sm">{texto}</p>}
            </li>
          );
        })}
      </ul>

      {sinPermiso.length > 0 && (
        <details className="rounded-2xl border border-borde p-3">
          <summary className="flex cursor-pointer items-center gap-2 text-sm text-suave">
            <ShieldOff className="h-4 w-4" aria-hidden /> {sinPermiso.length} sin consentimiento o sin {canal === "whatsapp" ? "teléfono" : "email"} (no se les puede enviar)
          </summary>
          <ul className="mt-2 space-y-1 text-sm">
            {sinPermiso.map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <span className="text-suave line-through">{c.nombre_negocio}</span>
                <Link href={`/clientes/${c.id}`} className="text-xs text-marca underline">
                  Ver ficha
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
