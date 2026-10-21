import type { Metadata } from "next";
import { Cabecera, Proximamente } from "@/components/app/piezas";

export const metadata: Metadata = { title: "Nueva visita" };

export default function PaginaNuevaVisita() {
  return (
    <>
      <Cabecera titulo="Nueva visita" subtitulo="Menos de 30 segundos" />
      <Proximamente paso={1}>
        Buscar o crear cliente, resultado con botones grandes, productos, nota o dictado, foto y próxima acción. Funcionará sin cobertura.
      </Proximamente>
    </>
  );
}
