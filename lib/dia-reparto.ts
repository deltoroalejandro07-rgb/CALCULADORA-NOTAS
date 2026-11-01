import "server-only";
import { cookies } from "next/headers";

const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

/** El día de reparto elegido: el de la dirección (?fecha=) o, si no viene, el último que se eligió. */
export async function diaDeReparto(param: unknown, porDefecto: string): Promise<string> {
  if (typeof param === "string" && FORMATO.test(param)) return param;
  const guardado = (await cookies()).get("dia_reparto")?.value;
  return guardado && FORMATO.test(guardado) ? guardado : porDefecto;
}
