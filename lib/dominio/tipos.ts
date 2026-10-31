// Valores de los enums de Postgres (supabase/migrations/*_esquema.sql) con su texto en pantalla.

export const ROLES = ["admin", "comercial", "repartidor"] as const;
export const TEXTO_ROL: Record<(typeof ROLES)[number], string> = { admin: "Administrador", comercial: "Comercial", repartidor: "Repartidor" };
export type Rol = (typeof ROLES)[number];

export const TIPOS_NEGOCIO = ["bar", "restaurante", "cafeteria", "hotel", "pub", "catering", "otro"] as const;
export type TipoNegocio = (typeof TIPOS_NEGOCIO)[number];
export const TEXTO_TIPO_NEGOCIO: Record<TipoNegocio, string> = {
  bar: "Bar",
  restaurante: "Restaurante",
  cafeteria: "Cafetería",
  hotel: "Hotel",
  pub: "Pub",
  catering: "Catering",
  otro: "Otro",
};

export const ESTADOS_CLIENTE = ["prospecto", "interesado", "cliente", "perdido"] as const;
export type EstadoCliente = (typeof ESTADOS_CLIENTE)[number];
export const TEXTO_ESTADO: Record<EstadoCliente, string> = {
  prospecto: "Prospecto",
  interesado: "Interesado",
  cliente: "Cliente",
  perdido: "Perdido",
};

export const TIPOS_VISITA = ["puerta_fria", "propaganda", "seguimiento", "degustacion", "toma_pedido", "incidencia"] as const;
export type TipoVisita = (typeof TIPOS_VISITA)[number];
export const TEXTO_TIPO_VISITA: Record<TipoVisita, string> = {
  puerta_fria: "Puerta fría",
  propaganda: "Entrega de propaganda",
  seguimiento: "Seguimiento",
  degustacion: "Degustación",
  toma_pedido: "Toma de pedido",
  incidencia: "Incidencia",
};

export const RESULTADOS_VISITA = ["no_estaba", "sin_interes", "pide_info", "interesado", "pide_oferta", "hace_pedido"] as const;
export type ResultadoVisita = (typeof RESULTADOS_VISITA)[number];
export const TEXTO_RESULTADO: Record<ResultadoVisita, string> = {
  no_estaba: "No estaba el responsable",
  sin_interes: "Sin interés",
  pide_info: "Pide información",
  interesado: "Interesado",
  pide_oferta: "Pide oferta",
  hace_pedido: "Hace pedido",
};

export const CATEGORIAS_PRODUCTO = ["cerveza", "refrescos", "agua", "vino", "licores", "cafe", "alimentacion", "limpieza_menaje"] as const;
export type CategoriaProducto = (typeof CATEGORIAS_PRODUCTO)[number];
export const TEXTO_CATEGORIA: Record<CategoriaProducto, string> = {
  cerveza: "Cerveza",
  refrescos: "Refrescos",
  agua: "Agua",
  vino: "Vino",
  licores: "Licores",
  cafe: "Café",
  alimentacion: "Alimentación",
  limpieza_menaje: "Limpieza y menaje",
};
