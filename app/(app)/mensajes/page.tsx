import type { Metadata } from "next";
import { Cabecera, Proximamente } from "@/components/app/piezas";

export const metadata: Metadata = { title: "Mensajes" };

export default function PaginaMensajes() {
  return (
    <>
      <Cabecera titulo="Mensajes" subtitulo="Plantillas y campañas" />
      <Proximamente paso={5}>
        Plantillas con variables, campañas por segmento y envío por WhatsApp o email solo a clientes con consentimiento.
      </Proximamente>
    </>
  );
}
