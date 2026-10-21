import type { EstadoCliente, TipoNegocio } from "./tipos";

// Datos editables de un cliente (formulario de alta y edición).
// Fuera de los componentes "use client" para poder usarlos también en el servidor.
export interface DatosCliente {
  id?: string;
  nombre_negocio: string;
  tipo: TipoNegocio;
  estado: EstadoCliente;
  motivo_perdida: string | null;
  contacto_nombre: string | null;
  contacto_cargo: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  localidad: string | null;
  codigo_postal: string | null;
  zona: string | null;
  lat: number | null;
  lng: number | null;
  horario_visita: string | null;
  proveedor_actual: string | null;
  volumen_estimado_eur: number | null;
  etiquetas: string[];
  notas: string | null;
  proxima_accion: string | null;
  proxima_accion_fecha: string | null;
  comercial_id: string | null;
}

export const CLIENTE_VACIO: DatosCliente = {
  nombre_negocio: "",
  tipo: "bar",
  estado: "prospecto",
  motivo_perdida: null,
  contacto_nombre: null,
  contacto_cargo: null,
  telefono: null,
  email: null,
  direccion: null,
  localidad: null,
  codigo_postal: null,
  zona: null,
  lat: null,
  lng: null,
  horario_visita: null,
  proveedor_actual: null,
  volumen_estimado_eur: null,
  etiquetas: [],
  notas: null,
  proxima_accion: null,
  proxima_accion_fecha: null,
  comercial_id: null,
};
