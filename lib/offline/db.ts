import Dexie, { type EntityTable } from "dexie";
import type { MarcaProducto, TipoFoto } from "../dominio/visita";
import type {
  CategoriaProducto,
  EstadoCliente,
  ResultadoVisita,
  TipoNegocio,
  TipoVisita,
} from "../dominio/tipos";

/** Copia local de los clientes del comercial para buscar sin cobertura. */
export interface ClienteLocal {
  id: string;
  nombre_negocio: string;
  tipo: TipoNegocio;
  zona: string | null;
  direccion: string | null;
  contacto_nombre: string | null;
  telefono: string | null;
  lat: number | null;
  lng: number | null;
  estado: EstadoCliente;
  consiente_whatsapp: boolean;
  consiente_email: boolean;
  ultima_visita_at: string | null;
  is_seed: boolean;
  /** Creado en el móvil y aún no subido. */
  pendiente?: boolean;
}

export interface ProductoLocal {
  id: string;
  nombre: string;
  categoria: CategoriaProducto;
  formato: string | null;
  destacado: boolean;
}

export interface ClienteNuevo {
  id: string;
  nombre_negocio: string;
  tipo: TipoNegocio;
  telefono: string | null;
  contacto_nombre: string | null;
  lat: number | null;
  lng: number | null;
}

export interface VisitaNueva {
  id: string;
  cliente_id: string;
  fecha: string;
  lat: number | null;
  lng: number | null;
  precision_m: number | null;
  tipo: TipoVisita;
  resultado: ResultadoVisita;
  material_entregado: string[];
  notas: string | null;
  proxima_accion: string | null;
  proxima_accion_fecha: string | null;
  /** Sin catálogo: siempre vacío en visitas nuevas (se conserva por las que quedaran en cola). */
  productos: { producto_id: string; relacion: MarcaProducto }[];
  /** Qué productos le interesan, escrito por el comercial. */
  interes_texto?: string | null;
  fotos: { id: string; tipo: TipoFoto }[];
  consentimientos: { id: string; canal: "whatsapp" | "email" }[];
}

export type Operacion =
  | { id: string; tipo: "cliente"; datos: ClienteNuevo; creada_at: number; intentos: number; error?: string }
  | { id: string; tipo: "visita"; datos: VisitaNueva; creada_at: number; intentos: number; error?: string };

export interface FotoPendiente {
  id: string;
  visita_id: string;
  cliente_id: string;
  blob: Blob;
}

export class BaseLocal extends Dexie {
  clientes!: EntityTable<ClienteLocal, "id">;
  productos!: EntityTable<ProductoLocal, "id">;
  cola!: EntityTable<Operacion, "id">;
  fotos!: EntityTable<FotoPendiente, "id">;

  constructor(nombre = "crm-horeca") {
    super(nombre);
    this.version(1).stores({
      clientes: "id, nombre_negocio",
      productos: "id",
      cola: "id, creada_at",
      fotos: "id, visita_id",
    });
  }
}

let instancia: BaseLocal | null = null;

export function baseLocal(): BaseLocal {
  instancia ??= new BaseLocal();
  return instancia;
}
