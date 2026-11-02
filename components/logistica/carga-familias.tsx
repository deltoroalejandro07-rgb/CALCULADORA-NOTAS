import { agruparPorFamilia } from "@/lib/dominio/familias";

/** Hoja de carga agrupada por familias (Cerveza, Refrescos, Limpieza…), con el total de cada una. */
export function CargaPorFamilias({ lineas }: { lineas: { clave: string; descripcion: string; cantidad: number }[] }) {
  return (
    <div className="space-y-3">
      {agruparPorFamilia(lineas).map((g) => (
        <section key={g.familia} className="break-inside-avoid">
          <p className="flex items-center justify-between rounded-md bg-marca-suave px-2.5 py-1.5 text-[13px] font-semibold text-marca">
            <span>{g.familia}</span>
            <span className="tabular-nums">{g.total.toLocaleString("es-ES")} uds.</span>
          </p>
          <ul className="divide-y divide-borde text-sm">
            {g.lineas.map((l) => (
              <li key={l.clave} className="flex justify-between gap-3 py-1.5 pl-2.5">
                <span>{l.descripcion}</span>
                <span className="font-semibold tabular-nums">{l.cantidad.toLocaleString("es-ES")}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
