// Familias de producto para la hoja de carga, deducidas del nombre que viene en el albarán de Holded.
// Las reglas van en orden: la primera que coincide manda (p. ej. «cerveza sin alcohol» es Cerveza).

export const FAMILIAS = [
  "Cerveza",
  "Refrescos y zumos",
  "Agua",
  "Vinos y cava",
  "Licores",
  "Café e infusiones",
  "Lácteos",
  "Aceite y vinagre",
  "Alimentación",
  "Congelados",
  "Limpieza",
  "Menaje y desechables",
  "Envases y gas",
  "Otros",
] as const;
export type Familia = (typeof FAMILIAS)[number];

const quitarTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Palabras que se buscan como palabra completa (o principio de palabra) en el nombre sin tildes
const REGLAS: [Familia, string[]][] = [
  ["Envases y gas", ["co2", "botella de gas", "gas carbonico", "bombona", "envase retornable", "caja vacia", "barril vacio", "deposito envase", "casco"]],
  ["Cerveza", ["cerveza", "cervezas", "beer", "lager", "ipa", "radler", "clara", "mahou", "estrella", "damm", "cruzcampo", "heineken", "amstel", "alhambra", "san miguel", "voll damm", "turia", "keler", "ambar", "moritz", "coronita", "corona", "desperados", "guinness", "paulaner", "budweiser", "1906", "free damm", "shandy", "tostada"]],
  ["Vinos y cava", ["vino", "vinos", "tinto", "blanco", "rosado", "cava", "champagne", "champan", "rioja", "ribera", "rueda", "albarino", "verdejo", "tempranillo", "lambrusco", "sangria", "tinto de verano", "moscatel", "vermut", "vermouth", "martini", "jerez", "fino", "manzanilla", "sidra"]],
  ["Licores", ["ginebra", "gin", "ron", "rum", "whisky", "whiskey", "vodka", "tequila", "licor", "orujo", "brandy", "cognac", "cognac", "anis", "pacharan", "baileys", "jagermeister", "jager", "aperol", "campari", "absenta", "mezcal", "coñac", "conac", "crema de", "hierbas", "limoncello", "beefeater", "bombay", "tanqueray", "larios", "puerto de indias", "barcelo", "brugal", "havana", "bacardi", "cacique", "ballantines", "jb", "johnnie", "jack daniels", "dyc", "smirnoff", "absolut", "eristoff", "malibu", "licor 43", "ruavieja", "magno", "veterano", "soberano"]],
  ["Agua", ["agua", "aguas", "bezoya", "solan", "lanjaron", "font vella", "fontvella", "aquarel", "evian", "vichy", "perrier", "san pellegrino", "pellegrino", "cabreiroa", "fuente liviana", "bronchales", "sant aniol"]],
  ["Refrescos y zumos", ["refresco", "refrescos", "cola", "coca", "coca-cola", "pepsi", "fanta", "sprite", "seven up", "7up", "kas", "schweppes", "tonica", "nordic", "ginger", "aquarius", "nestea", "lipton", "red bull", "monster", "burn", "bebida energetica", "zumo", "zumos", "nectar", "granini", "pago", "bitter", "trina", "mosto", "gaseosa", "la casera", "limonada", "naranjada", "isotonica", "powerade", "gatorade", "horchata", "batido", "fever-tree", "fever tree", "royal bliss"]],
  ["Café e infusiones", ["cafe", "café", "capsula", "capsulas", "descafeinado", "infusion", "infusiones", "te ", "manzanilla en", "poleo", "tila", "cacao", "chocolate a la taza", "colacao", "cola cao", "nesquik", "azucar", "sacarina", "edulcorante"]],
  ["Lácteos", ["leche", "nata", "yogur", "yogurt", "mantequilla", "queso", "lacteo", "batido de", "bebida de avena", "bebida de soja", "bebida vegetal"]],
  ["Aceite y vinagre", ["aceite", "aove", "oliva", "girasol", "vinagre", "aceitera"]],
  ["Congelados", ["congelado", "congelada", "congelados", "helado", "helados", "hielo", "cubitos", "patatas prefritas", "croquetas"]],
  ["Limpieza", ["limpieza", "lejia", "detergente", "lavavajillas", "abrillantador", "desengrasante", "friegasuelos", "fregasuelos", "jabon", "gel", "suavizante", "amoniaco", "salfuman", "desinfectante", "multiusos", "limpiacristales", "estropajo", "bayeta", "fregona", "cubo", "escoba", "guantes", "ambientador", "insecticida", "sosa", "cal ", "antical", "papel higienico", "higienico", "secamanos", "bobina", "rollo industrial"]],
  ["Menaje y desechables", ["servilleta", "servilletas", "mantel", "manteles", "vaso", "vasos", "plato", "platos", "cubierto", "cubiertos", "pajita", "pajitas", "palillo", "palillos", "film", "papel aluminio", "aluminio", "bolsa de basura", "bolsas de basura", "bolsas basura", "envase desechable", "tarrina", "bandeja", "blonda", "posavasos", "tenedor", "cuchara", "cuchillo", "copa", "copas", "taza", "tazas", "desechable"]],
  ["Alimentación", ["conserva", "conservas", "atun", "bonito", "anchoa", "anchoas", "mejillon", "berberecho", "aceituna", "aceitunas", "encurtido", "pepinillo", "patatas fritas", "snack", "snacks", "frutos secos", "almendra", "cacahuete", "pistacho", "pipas", "galleta", "galletas", "pan", "harina", "arroz", "pasta", "legumbre", "garbanzo", "lenteja", "tomate", "ketchup", "mayonesa", "mostaza", "salsa", "sal ", "pimienta", "especia", "embutido", "jamon", "chorizo", "lomo", "salchichon", "fuet", "bocadillo", "azafran", "caldo", "miel", "mermelada", "bolleria", "magdalena", "croissant"]],
];

// Precompila cada palabra como «empieza palabra» para no confundir «gin» con «original» o «ron» con «naranja»
const PATRONES: [Familia, RegExp][] = REGLAS.map(([f, palabras]) => [
  f,
  new RegExp(`(^|[^a-z0-9])(${palabras.map((p) => quitarTildes(p).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?=$|[^a-z0-9])`),
]);

/** Familia de un producto por su nombre. Lo que no se reconoce va a «Otros». */
export function familiaDe(descripcion: string): Familia {
  const t = ` ${quitarTildes(descripcion).replace(/\s+/g, " ")} `;
  for (const [f, re] of PATRONES) if (re.test(t)) return f;
  return "Otros";
}

/** Agrupa las líneas de carga por familia (en el orden de FAMILIAS), con el total de cada una. */
export function agruparPorFamilia<T extends { descripcion: string; cantidad: number }>(lineas: T[]): { familia: Familia; total: number; lineas: T[] }[] {
  const grupos = new Map<Familia, T[]>();
  for (const l of lineas) {
    const f = familiaDe(l.descripcion);
    grupos.set(f, [...(grupos.get(f) ?? []), l]);
  }
  return FAMILIAS.filter((f) => grupos.has(f)).map((f) => {
    const ls = grupos.get(f)!.sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es"));
    return { familia: f, total: ls.reduce((s, l) => s + l.cantidad, 0), lineas: ls };
  });
}
