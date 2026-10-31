"""Genera PDF de albaranes de PRUEBA con la plantilla de Holded (mismas posiciones).
Datos inventados. Uso: python3 tests/fixtures/generar-albaranes.py"""
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import os

AQUI = os.path.dirname(os.path.abspath(__file__))

def albaran(c, numero, cliente, nif, fiscal, envio, telefono, lineas, horario="", ruta="", pag="Pág. 1 de 1"):
    c.setFont("Helvetica-Bold", 12); c.drawString(404, 800, f"PEDIDO DE VENTA #{numero}")
    c.setFont("Helvetica", 9); c.drawString(473, 787, "Fecha: 30/10/2026")
    c.setFont("Helvetica-Bold", 11); c.drawString(45, 744, "Distribuidora de Prueba, S.L.")
    c.setFont("Helvetica", 9)
    for y, t in [(731, "B00000000"), (719, "Calle del Almacén 1"), (707, "Higueruelas (46162), Valencia, España"), (695, "info@ejemplo.com"), (683, "600000000")]:
        c.drawString(45, y, t)
    c.setFont("Helvetica", 7); c.drawString(52, 662, "Cliente:"); c.drawString(331, 662, "Dirección de envío:")
    c.setFont("Helvetica-Bold", 9); c.drawString(52, 638, cliente)
    c.setFont("Helvetica", 9)
    izq = [nif, *fiscal, telefono]
    for i, t in enumerate(izq):
        c.drawString(52, 626 - 12 * i, t)
    for i, t in enumerate(envio):
        c.drawString(331, 638 - 12 * i, t)
    c.setFont("Helvetica", 8)
    for x, t in [(49, "CONCEPTO"), (335, "PRECIO"), (381, "UNIDADES"), (430, "SUBTOTAL"), (496, "IVA"), (525, "TOTAL")]:
        c.drawString(x, 512, t)
    y = 489
    for desc, precio, unid in lineas:
        c.setFont("Helvetica-Bold", 8); c.drawString(49, y, desc)
        c.setFont("Helvetica", 8)
        c.drawString(336, y, precio); c.drawString(414, y, unid); c.drawString(441, y, precio); c.drawString(493, y, "10%"); c.drawString(519, y, precio)
        c.drawString(49, y - 11, desc.title())
        y -= 30
    c.setFont("Helvetica-Bold", 8); c.drawString(412, y - 10, "BASE IMPONIBLE"); c.drawString(450, y - 50, "TOTAL")
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(43, 357, f"Horario {horario}".strip()); c.drawString(43, 332, f"Ruta {ruta}".strip())
    c.setFont("Helvetica", 7); c.drawString(279, 17, pag)
    c.showPage()

c = canvas.Canvas(os.path.join(AQUI, "albaranes-holded-prueba.pdf"), pagesize=A4)
albaran(c, "SO900001", "BAR LA PLAZA DE PRUEBA S.L.", "B11111111", ["CALLE FISCAL PRUEBA, 1", "PATERNA (46980), Valencia, España"],
        ["CALLE MAYOR, 10", "VALENCIA (46001), Valencia, España"], "961111111",
        [("CERVEZA BARRIL 30L", "90,00€", "2"), ("AGUA 1,5L PACK 6", "2,10€", "5")], horario="antes de las 10", ruta="Valencia Centro")
albaran(c, "SO900002", "RESTAURANTE EL PUERTO PRUEBA", "B22222222", ["AVENIDA DEL PUERTO, 200", "VALENCIA (46023), Valencia, España"],
        ["AVENIDA DEL PUERTO, 200", "VALENCIA (46023), Valencia, España"], "962222222",
        [("REFRESCO COLA CAJA 24", "14,40€", "3")], ruta="Valencia Centro")
c.save()

c = canvas.Canvas(os.path.join(AQUI, "albaran-holded-prueba-2.pdf"), pagesize=A4)
albaran(c, "SO900003", "CAFETERIA SOL DE PRUEBA", "B33333333", ["CALLE SAN VICENTE, 50", "VALENCIA (46007), Valencia, España"], [], "963333333",
        [("CAFE GRANO 1KG", "18,00€", "4")], horario="de 8 a 11", ruta="Valencia Centro")
c.save()
print("ok")
