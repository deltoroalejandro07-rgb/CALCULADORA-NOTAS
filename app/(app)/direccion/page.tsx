import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { BarrasHorizontales, Cifra, Columnas, ColumnasApiladas, Tarjeta } from "@/components/direccion/graficos";
import { exigirAdmin } from "@/lib/auth";
import { cargarDireccion } from "@/lib/datos/direccion";
import { TEXTO_ESTADO } from "@/lib/dominio/tipos";


export const metadata: Metadata = { title: "Panel de dirección" };

const MES = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" });
const nombreMes = (m: string) => MES.format(new Date(m + "-15T12:00:00Z")).replace(".", "");
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const pct = (x: number) => `${Math.round(x * 100)} %`;

export default function PaginaDireccion() {
  return (
    <>
      <Link href="/mas" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Más
      </Link>
      <Cabecera titulo="Panel de dirección" subtitulo="Últimas 8 semanas · todo el equipo" />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirAdmin();
  const d = await cargarDireccion();
  const embudoActivo = d.embudo.filter((e) => e.estado !== "perdido");
  const clientesTotal = d.embudo.reduce((s, e) => s + e.n, 0);
  const nuevosEsteMes = d.nuevosMes[d.nuevosMes.length - 1]?.n ?? 0;
  const interesados = d.embudo.find((e) => e.estado === "interesado")?.n ?? 0;

  return (
    <div className="space-y-4 px-4 pb-8">
      <div className="grid grid-cols-2 gap-3">
        <Cifra valor={String(d.totalVisitas)} etiqueta="Visitas" detalle={`${(d.totalVisitas / d.semanas).toFixed(1).replace(".", ",")} por semana`} />
        <Cifra valor={pct(d.tasaConversion)} etiqueta="Visitas que acaban en pedido" detalle={`${d.totalPedidosVisita} pedidos en visita`} />
        <Cifra valor={String(nuevosEsteMes)} etiqueta="Clientes nuevos este mes" detalle={`${clientesTotal} en total`} />
        <Cifra valor={String(interesados)} etiqueta="Clientes interesados" detalle="ahora mismo" />
      </div>

      <Tarjeta titulo="Visitas por comercial y semana" subtitulo="Semana que empieza el lunes indicado">
        <ColumnasApiladas series={d.comerciales.map((c) => c.nombre)} filas={d.visitasSemana.map((s) => ({ etiqueta: ddmm(s.semana), valores: s.valores }))} />
      </Tarjeta>

      <Tarjeta titulo="Embudo de clientes" subtitulo="Cuántos hay ahora en cada estado">
        <BarrasHorizontales
          datos={[
            ...embudoActivo.map((e, i) => ({ nombre: TEXTO_ESTADO[e.estado], n: e.n, color: `var(--ordinal-${i + 1})` })),
            ...d.embudo.filter((e) => e.estado === "perdido").map((e) => ({ nombre: "Perdidos", n: e.n, color: "var(--neutro-grafico)" })),
          ]}
        />
        {embudoActivo[0]?.n > 0 && (
          <p className="mt-3 text-xs text-suave">
            De cada 100 fichas activas, {Math.round((embudoActivo[2].n / Math.max(1, embudoActivo.reduce((s, e) => s + e.n, 0))) * 100)} ya son clientes.
          </p>
        )}
      </Tarjeta>

      <Tarjeta titulo="Conversión de visitas a pedido" subtitulo="Por comercial, últimas 8 semanas">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-left text-xs text-suave">
              <th className="py-1 font-normal">Comercial</th>
              <th className="py-1 text-right font-normal">Visitas</th>
              <th className="py-1 text-right font-normal">Pedidos</th>
              <th className="py-1 text-right font-normal">Conversión</th>
            </tr>
          </thead>
          <tbody>
            {d.conversion.map((c) => (
              <tr key={c.id} className="border-t border-borde">
                <td className="py-1.5">{c.nombre}</td>
                <td className="py-1.5 text-right">{c.visitas}</td>
                <td className="py-1.5 text-right">{c.pedidos}</td>
                <td className="py-1.5 text-right font-semibold">{c.visitas ? pct(c.tasa) : "—"}</td>
              </tr>
            ))}
            {!d.conversion.length && (
              <tr>
                <td colSpan={4} className="py-2 text-suave">
                  Aún no hay comerciales con visitas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Tarjeta>

      <Tarjeta titulo="Clientes nuevos por mes">
        <Columnas datos={d.nuevosMes.map((m) => ({ etiqueta: nombreMes(m.mes), n: m.n }))} />
      </Tarjeta>

      <Tarjeta titulo="Zonas con más actividad" subtitulo="Visitas en las últimas 8 semanas">
        <BarrasHorizontales datos={d.zonas} />
      </Tarjeta>
    </div>
  );
}
