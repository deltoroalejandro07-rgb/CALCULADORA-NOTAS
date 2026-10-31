// Lector de los PDF de pedido/albarán de Holded (plantilla estándar). Sin IA: el PDF trae
// texto real con su posición, así que se lee con exactitud y sin coste.

export interface Elemento {
  x: number;
  texto: string;
}
/** Una fila del PDF: elementos a la misma altura, de izquierda a derecha. */
export type Fila = Elemento[];

export interface LineaAlbaran {
  descripcion: string;
  cantidad: number;
}

export interface AlbaranLeido {
  numero: string | null;
  fecha: string | null; // AAAA-MM-DD
  cliente: string;
  nif: string | null;
  telefono: string | null;
  direccion: string | null;
  localidad: string | null;
  codigo_postal: string | null;
  lineas: LineaAlbaran[];
  horario: string | null; // campo "Horario" tal cual
  ruta: string | null; // campo "Ruta" tal cual (→ zona)
  notas: string | null;
}

const RE_DOC = /(PEDIDO DE VENTA|ALBAR[AÁ]N|PRESUPUESTO|PROFORMA|FACTURA)\s*#?\s*([A-Z0-9][\w\-/]*)/i;
const RE_FECHA = /Fecha:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i;
// NIF/CIF/NIE español: siempre lleva letra (un teléfono son 9 cifras sin letra)
const RE_NIF = /^([A-Z]\d{7}[A-Z0-9]|\d{8}[A-Z])$/i;
const RE_TEL = /^\+?[\d\s]{9,15}$/;
const RE_LOCALIDAD = /^(.*?)\s*\((\d{5})\)/;
const RE_PAG = /^P[áa]g\.\s*(\d+)\s*de\s*(\d+)/i;

const texto = (f: Fila) => f.map((e) => e.texto).join(" ").trim();

/** "1", "1,5", "1.250" → número; si no es un número, null. */
export function leerNumero(s: string): number | null {
  const t = s.replace(/\s|€/g, "");
  if (!/^-?[\d.,]+$/.test(t)) return null;
  const n = Number(t.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function bloqueDireccion(lineas: string[]) {
  const r = { nombre: null as string | null, nif: null as string | null, telefono: null as string | null, direccion: null as string | null, localidad: null as string | null, codigo_postal: null as string | null };
  const calle: string[] = [];
  for (const l of lineas) {
    const loc = l.match(RE_LOCALIDAD);
    if (loc) {
      r.localidad = loc[1].trim() || null;
      r.codigo_postal = loc[2];
    } else if (RE_NIF.test(l.replace(/[\s-]/g, ""))) r.nif = l.replace(/[\s-]/g, "").toUpperCase();
    else if (RE_TEL.test(l)) r.telefono = l.replace(/\s/g, "");
    else if (/@/.test(l)) continue;
    else calle.push(l);
  }
  r.nombre = calle.length > 1 || (calle.length === 1 && !r.localidad) ? calle[0] : null;
  r.direccion = (r.nombre ? calle.slice(1) : calle).join(", ") || null;
  return r;
}

/**
 * Lee uno o varios documentos (un PDF puede traer varios albaranes; cada uno empieza
 * con su "PEDIDO DE VENTA #…" y puede ocupar varias páginas). Devuelve [] si el formato
 * no es el de Holded.
 */
export function leerAlbaranesHolded(paginas: Fila[][]): AlbaranLeido[] {
  const docs: AlbaranLeido[] = [];
  let actual: AlbaranLeido | null = null;

  for (const filas of paginas) {
    const cab = filas.find((f) => RE_DOC.test(texto(f)));
    const pag = filas.map(texto).find((t) => RE_PAG.test(t))?.match(RE_PAG);
    const continua = actual && pag && Number(pag[1]) > 1;
    if (cab && !continua) {
      const m = texto(cab).match(RE_DOC)!;
      const f = filas.map(texto).find((t) => RE_FECHA.test(t))?.match(RE_FECHA);
      actual = {
        numero: m[2].toUpperCase(),
        fecha: f ? `${f[3]}-${f[2].padStart(2, "0")}-${f[1].padStart(2, "0")}` : null,
        cliente: "",
        nif: null,
        telefono: null,
        direccion: null,
        localidad: null,
        codigo_postal: null,
        lineas: [],
        horario: null,
        ruta: null,
        notas: null,
      };
      docs.push(actual);
    }
    if (!actual) continue;

    // Bloques "Cliente:" (izquierda) y "Dirección de envío:" (derecha)
    const iCli = filas.findIndex((f) => f.some((e) => /^Cliente:?$/i.test(e.texto.trim())));
    const iTabla = filas.findIndex((f) => f.some((e) => /^CONCEPTO$/i.test(e.texto.trim())));
    if (iCli >= 0) {
      const xEnvio = filas[iCli].find((e) => /^Direcci[oó]n de env[ií]o:?$/i.test(e.texto.trim()))?.x ?? Infinity;
      const izq: string[] = [];
      const der: string[] = [];
      for (const f of filas.slice(iCli + 1, iTabla >= 0 ? iTabla : undefined)) {
        const a = f.filter((e) => e.x < xEnvio - 5).map((e) => e.texto).join(" ").trim();
        const b = f.filter((e) => e.x >= xEnvio - 5).map((e) => e.texto).join(" ").trim();
        if (a) izq.push(a);
        if (b) der.push(b);
      }
      const cli = bloqueDireccion(izq);
      const env = bloqueDireccion(der);
      actual.cliente = cli.nombre ?? izq[0] ?? "";
      actual.nif = cli.nif;
      actual.telefono = env.telefono ?? cli.telefono;
      // Se entrega en la dirección de envío; si no hay, en la del cliente
      const usar = env.direccion || env.localidad ? env : cli;
      actual.direccion = usar.direccion;
      actual.localidad = usar.localidad;
      actual.codigo_postal = usar.codigo_postal;
    }

    // Tabla de productos: cada fila con unidades es una línea; las filas solo con texto son su detalle
    if (iTabla >= 0 || (continua && actual.lineas.length)) {
      const cabecera = iTabla >= 0 ? filas[iTabla] : null;
      const xUnid = cabecera?.find((e) => /^UNIDADES$/i.test(e.texto.trim()))?.x ?? 380;
      const xPrecio = cabecera?.find((e) => /^PRECIO$/i.test(e.texto.trim()))?.x ?? 330;
      const xSub = cabecera?.find((e) => /^SUBTOTAL$/i.test(e.texto.trim()))?.x ?? xUnid + 50;
      for (const f of filas.slice(iTabla >= 0 ? iTabla + 1 : 0)) {
        const t = texto(f);
        if (/BASE IMPONIBLE|^TOTAL\b|^IVA\b/i.test(t) || RE_PAG.test(t) || /^(Horario|Ruta)\b/i.test(t)) break;
        const concepto = f.filter((e) => e.x < xPrecio - 10).map((e) => e.texto).join(" ").trim();
        const unid = f.find((e) => e.x >= xPrecio + 5 && e.x < xSub - 5 && leerNumero(e.texto) != null);
        if (concepto && unid) actual.lineas.push({ descripcion: concepto, cantidad: leerNumero(unid.texto)! });
      }
    }

    // Campos al pie: "Horario", "Ruta" y notas
    for (let i = 0; i < filas.length; i++) {
      const t = texto(filas[i]);
      const m = t.match(/^(Horario|Ruta|Notas|Observaciones)\s*:?\s*(.*)$/i);
      if (!m) continue;
      let valor = m[2].trim();
      // El valor puede venir en la fila siguiente si no es otra etiqueta
      const sig = filas[i + 1] ? texto(filas[i + 1]) : "";
      if (!valor && sig && !/^(Horario|Ruta|Notas|Observaciones)\b/i.test(sig) && !RE_PAG.test(sig) && (filas[i + 1][0]?.x ?? 0) <= (filas[i][0]?.x ?? 0) + 40) valor = sig;
      if (!valor) continue;
      const campo = m[1].toLowerCase();
      if (campo === "horario") actual.horario = valor;
      else if (campo === "ruta") actual.ruta = valor;
      else actual.notas = [actual.notas, valor].filter(Boolean).join(" · ");
    }
  }
  return docs.filter((d) => d.cliente);
}
