import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

// PDF de la hoja de ruta: hoja de carga (suma por producto) + orden de reparto. Sin mapas.

export interface HojaRuta {
  fecha: string; // «Sábado 31/10/2026»
  vehiculo: string;
  conductor: string;
  resumen: string | null; // «25,1 km · 4 h 24 min · salida 08:00»
  carga: { descripcion: string; cantidad: number }[];
  paradas: {
    hora: string | null;
    cliente: string;
    direccion: string;
    telefono: string | null;
    horario: string | null;
    acceso: string | null;
    notas: string | null;
    albaran: string | null;
    lineas: string[];
  }[];
}

const A4: [number, number] = [595.28, 841.89];
const M = 42; // margen
const VERDE = rgb(0.184, 0.49, 0.467);
const GRIS = rgb(0.36, 0.39, 0.45);
const LINEA = rgb(0.85, 0.87, 0.9);

/** Quita los caracteres que las fuentes estándar del PDF no pueden escribir. */
function limpiar(texto: string, f: PDFFont): string {
  let r = "";
  for (const c of texto.replace(/→/g, "->").replace(/\s+/g, " ")) {
    try {
      f.encodeText(c);
      r += c;
    } catch {
      r += "?";
    }
  }
  return r;
}

function partir(texto: string, f: PDFFont, tam: number, ancho: number): string[] {
  const palabras = limpiar(texto, f).split(" ");
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (f.widthOfTextAtSize(prueba, tam) <= ancho || !actual) actual = prueba;
    else {
      lineas.push(actual);
      actual = p;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

export async function pdfHojaRuta(h: HojaRuta): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Hoja de ruta ${h.fecha} · ${h.vehiculo}`);
  doc.setAuthor("dliverygo");
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const ancho = A4[0] - 2 * M;

  let pagina: PDFPage = doc.addPage(A4);
  let y = A4[1] - M;
  const nuevaPagina = () => {
    pagina = doc.addPage(A4);
    y = A4[1] - M;
  };
  const sitio = (alto: number) => {
    if (y - alto < M + 20) nuevaPagina();
  };
  const escribir = (texto: string, { f = normal, tam = 10, x = M, color = rgb(0.07, 0.09, 0.15), max = ancho } = {}) => {
    for (const l of partir(texto, f, tam, max)) {
      sitio(tam + 3);
      pagina.drawText(l, { x, y: y - tam, size: tam, font: f, color });
      y -= tam + 3;
    }
  };

  // Cabecera
  pagina.drawText("dliverygo", { x: M, y: y - 20, size: 20, font: negrita, color: VERDE });
  pagina.drawText(limpiar("Hoja de ruta", negrita), { x: A4[0] - M - negrita.widthOfTextAtSize("Hoja de ruta", 16), y: y - 18, size: 16, font: negrita });
  y -= 34;
  escribir(h.fecha, { f: negrita, tam: 13 });
  escribir(`${h.vehiculo} · Conductor: ${h.conductor} · ${h.paradas.length} paradas`, { tam: 10, color: GRIS });
  if (h.resumen) escribir(h.resumen, { tam: 10, color: GRIS });
  y -= 8;

  // Hoja de carga
  const titulo = (t: string) => {
    sitio(40);
    y -= 6;
    pagina.drawText(limpiar(t, negrita), { x: M, y: y - 12, size: 12, font: negrita, color: VERDE });
    y -= 18;
    pagina.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 1, color: VERDE });
    y -= 6;
  };
  titulo("HOJA DE CARGA (total del día)");
  if (!h.carga.length) escribir("Sin productos en los albaranes.", { color: GRIS });
  for (const l of h.carga) {
    sitio(16);
    const cantidad = l.cantidad.toLocaleString("es-ES");
    const lineas = partir(l.descripcion, normal, 10, ancho - 80);
    lineas.forEach((t, i) => {
      sitio(14);
      pagina.drawText(t, { x: M, y: y - 10, size: 10, font: normal });
      if (i === 0) pagina.drawText(cantidad, { x: A4[0] - M - negrita.widthOfTextAtSize(cantidad, 11), y: y - 10, size: 11, font: negrita });
      y -= 14;
    });
    pagina.drawLine({ start: { x: M, y: y + 2 }, end: { x: A4[0] - M, y: y + 2 }, thickness: 0.5, color: LINEA });
  }
  y -= 10;

  // Orden de reparto
  titulo("ORDEN DE REPARTO");
  h.paradas.forEach((p, i) => {
    const productos = p.lineas.join(" · ");
    const alto = 40 + Math.ceil(normal.widthOfTextAtSize(limpiar(productos, normal), 9) / (ancho - 40)) * 12;
    sitio(Math.min(alto, 160));
    const yInicio = y;
    pagina.drawCircle({ x: M + 11, y: y - 11, size: 11, color: VERDE });
    const n = String(i + 1);
    pagina.drawText(n, { x: M + 11 - negrita.widthOfTextAtSize(n, 11) / 2, y: y - 15, size: 11, font: negrita, color: rgb(1, 1, 1) });
    if (p.hora) {
      const hora = `Llegada ${p.hora}`;
      pagina.drawText(hora, { x: A4[0] - M - negrita.widthOfTextAtSize(hora, 11), y: y - 13, size: 11, font: negrita, color: VERDE });
    }
    const x = M + 30;
    const max = ancho - 30 - (p.hora ? 90 : 0);
    escribir(p.cliente + (p.albaran ? `  (${p.albaran})` : ""), { f: negrita, tam: 11, x, max });
    escribir(p.direccion || "Sin dirección", { tam: 10, x, max: ancho - 30 });
    const datos = [p.telefono && `Tel. ${p.telefono}`, p.horario && `Horario: ${p.horario}`, p.acceso && `Acceso: ${p.acceso}`].filter(Boolean).join(" · ");
    if (datos) escribir(datos, { tam: 9, x, color: GRIS, max: ancho - 30 });
    if (p.notas) escribir(`Nota: ${p.notas}`, { tam: 9, x, color: rgb(0.7, 0.4, 0), max: ancho - 30 });
    if (productos) escribir(productos, { tam: 9, x, max: ancho - 30 });
    // Casilla para marcar a mano
    sitio(18);
    pagina.drawRectangle({ x, y: y - 11, width: 9, height: 9, borderColor: GRIS, borderWidth: 0.8 });
    pagina.drawText("Entregado", { x: x + 14, y: y - 10, size: 8, font: normal, color: GRIS });
    y -= 18;
    if (y < yInicio) pagina.drawLine({ start: { x: M, y: y + 2 }, end: { x: A4[0] - M, y: y + 2 }, thickness: 0.5, color: LINEA });
    y -= 6;
  });

  // Pie con nº de página
  const paginas = doc.getPages();
  paginas.forEach((pg, i) => {
    const t = `${h.vehiculo} · ${h.fecha} · Página ${i + 1} de ${paginas.length}`;
    pg.drawText(limpiar(t, normal), { x: M, y: 22, size: 8, font: normal, color: GRIS });
  });
  return doc.save();
}
