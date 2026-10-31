import { Footprints, Mail, MessageCircle, ShieldCheck, ShoppingCart } from "lucide-react";
import type { Ficha } from "@/lib/datos/ficha";
import { TEXTO_RESULTADO, TEXTO_TIPO_VISITA } from "@/lib/dominio/tipos";
import { TEXTO_TIPO_FOTO } from "@/lib/dominio/visita";
import { euros, fecha, fechaHora } from "@/lib/formato";

const TEXTO_ESTADO_MENSAJE: Record<string, string> = {
  preparado: "Preparado",
  enviado: "Enviado",
  entregado: "Entregado",
  leido: "Leído",
  respondido: "Respondido",
  fallido: "Fallido",
};

const TEXTO_ORIGEN: Record<string, string> = {
  verbal_visita: "de palabra en la visita",
  formulario_papel: "hoja firmada",
  whatsapp: "por WhatsApp",
  email: "por email",
  web: "formulario web",
};

type Evento = { cuando: string; clave: string; nodo: React.ReactNode };

export function Historial({ ficha }: { ficha: Ficha }) {
  const eventos: Evento[] = [
    ...ficha.visitas.map((v) => ({
      cuando: v.fecha,
      clave: `v-${v.id}`,
      nodo: (
        <>
          <Cabeza icono={Footprints} titulo={`${TEXTO_TIPO_VISITA[v.tipo]} · ${TEXTO_RESULTADO[v.resultado]}`} cuando={fechaHora(v.fecha)} quien={v.comercial?.nombre} />
          {v.notas && <p className="mt-1 whitespace-pre-line text-sm">{v.notas}</p>}
          {v.interes_texto && (
            <p className="mt-1 text-xs text-suave">
              <strong className="text-orange-700 dark:text-orange-300">Le interesa:</strong> {v.interes_texto}
            </p>
          )}
          {v.visita_productos.length > 0 && (
            <p className="mt-1 text-xs text-suave">
              {v.visita_productos.filter((p) => p.relacion === "interes").length > 0 && (
                <>
                  <strong className="text-orange-700 dark:text-orange-300">Le interesa:</strong>{" "}
                  {v.visita_productos.filter((p) => p.relacion === "interes").map((p) => p.productos?.nombre).join(", ")}.{" "}
                </>
              )}
              {v.visita_productos.filter((p) => p.relacion === "presentado").length > 0 && (
                <>Presentado: {v.visita_productos.filter((p) => p.relacion === "presentado").map((p) => p.productos?.nombre).join(", ")}.</>
              )}
            </p>
          )}
          {v.material_entregado.length > 0 && <p className="text-xs text-suave">Material: {v.material_entregado.join(", ")}</p>}
          {v.proxima_accion && (
            <p className="text-xs text-suave">
              Próxima: {v.proxima_accion}
              {v.proxima_accion_fecha ? ` (${fecha(v.proxima_accion_fecha)})` : ""}
            </p>
          )}
          {v.fotos.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {v.fotos.map((f) =>
                f.url ? (
                  <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={TEXTO_TIPO_FOTO[f.tipo]} className="h-20 w-20 rounded-lg object-cover" loading="lazy" />
                    <span className="block text-center text-[10px] text-suave">{TEXTO_TIPO_FOTO[f.tipo]}</span>
                  </a>
                ) : null,
              )}
            </div>
          )}
        </>
      ),
    })),
    ...ficha.mensajes.map((m) => ({
      cuando: m.enviado_at ?? m.creado_at,
      clave: `m-${m.id}`,
      nodo: (
        <>
          <Cabeza
            icono={m.canal === "whatsapp" ? MessageCircle : Mail}
            titulo={`${m.canal === "whatsapp" ? "WhatsApp" : "Email"} · ${TEXTO_ESTADO_MENSAJE[m.estado] ?? m.estado}`}
            cuando={fechaHora(m.enviado_at ?? m.creado_at)}
            quien={m.comercial?.nombre}
          />
          <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm">{m.texto}</p>
        </>
      ),
    })),
    ...ficha.pedidos.map((p) => ({
      cuando: p.fecha + "T12:00:00",
      clave: `p-${p.id}`,
      nodo: (
        <>
          <Cabeza icono={ShoppingCart} titulo={`Pedido · ${euros(p.importe_total)}`} cuando={fecha(p.fecha)} />
          <ul className="mt-1 text-xs text-suave">
            {p.pedido_lineas.map((l, i) => (
              <li key={i}>
                {Number(l.cantidad)} × {l.descripcion} — {euros(l.importe)}
              </li>
            ))}
          </ul>
          {p.notas && <p className="text-xs text-suave">{p.notas}</p>}
        </>
      ),
    })),
    ...ficha.consentimientos.map((c) => ({
      cuando: c.registrado_at,
      clave: `c-${c.id}`,
      nodo: (
        <>
          <Cabeza
            icono={ShieldCheck}
            titulo={`${c.otorgado ? "Consentimiento" : "Baja"} ${c.canal === "whatsapp" ? "WhatsApp" : "email"} (${TEXTO_ORIGEN[c.origen] ?? c.origen})`}
            cuando={fechaHora(c.registrado_at)}
          />
          {c.evidencia && <p className="text-xs text-suave">{c.evidencia}</p>}
        </>
      ),
    })),
  ].sort((a, b) => b.cuando.localeCompare(a.cuando));

  return (
    <section>
      <h2 className="mb-2 text-[13px] font-semibold text-suave">Historial</h2>
      {eventos.length === 0 ? (
        <p className="text-sm text-suave">Todavía no hay visitas, mensajes ni pedidos.</p>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-borde pl-4">
          {eventos.map((e) => (
            <li key={e.clave} className="relative rounded-xl border border-borde bg-superficie p-3">
              <span className="absolute -left-[1.42rem] top-4 h-3 w-3 rounded-full border-2 border-fondo bg-marca" aria-hidden />
              {e.nodo}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Cabeza({ icono: Icono, titulo, cuando, quien }: { icono: typeof Mail; titulo: string; cuando: string; quien?: string | null }) {
  return (
    <div className="flex items-start gap-2">
      <Icono className="mt-0.5 h-4 w-4 shrink-0 text-marca" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{titulo}</p>
        <p className="text-xs text-suave">
          {cuando}
          {quien ? ` · ${quien}` : ""}
        </p>
      </div>
    </div>
  );
}
