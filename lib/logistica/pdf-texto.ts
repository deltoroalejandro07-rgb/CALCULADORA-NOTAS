import "server-only";
import { getDocumentProxy } from "unpdf";
import type { Fila } from "./holded-pdf";

/** Texto de cada página del PDF agrupado en filas (misma altura), de arriba abajo. */
export async function filasDelPdf(datos: Uint8Array): Promise<Fila[][]> {
  const pdf = await getDocumentProxy(datos);
  const paginas: Fila[][] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const { items } = await (await pdf.getPage(n)).getTextContent();
    const filas = new Map<number, Fila>();
    for (const it of items) {
      if (!("str" in it) || !it.str.trim()) continue;
      const y = Math.round(it.transform[5]);
      const clave = [...filas.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      if (!filas.has(clave)) filas.set(clave, []);
      filas.get(clave)!.push({ x: it.transform[4], texto: it.str });
    }
    paginas.push(
      [...filas.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, f]) => f.sort((a, b) => a.x - b.x)),
    );
  }
  return paginas;
}
