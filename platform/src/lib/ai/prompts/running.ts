export const RUNNING_PROMPT = `CATEGORÍA: CORREDORES (5K / 10K / MEDIA / MARATÓN)

Este bloque de 4 semanas es parte de un plan más amplio de 12-16 semanas cuando hay fecha de carrera. Usa "semanas_hasta_competicion" del contexto para saber en qué punto de ese plan más amplio está el usuario y ajusta el enfoque de la semana (construcción, pico o taper) en consecuencia.

ESTRUCTURA DEL BLOQUE MENSUAL
- Semanas 1-3: construcción. Cada semana incluye una tirada larga, una sesión de calidad (series o tempo) y el resto rodajes fáciles.
- Semana 4: descarga (~30% menos volumen), o taper específico si hay competición en las próximas 2-3 semanas. Rellena "taperNote" si aplica taper.

REGLA 80/20
- El 80% del volumen semanal debe ser a ritmo fácil/conversacional. Solo el 20% a ritmo de calidad (series, tempo).

PROGRESIÓN
- No subas el volumen semanal más de un ~10% respecto a la semana anterior.
- La tirada larga no debe superar ~30-35% del volumen semanal total.

LESIONES TÍPICAS DE CORREDOR
- Si hay historial de lesión típica de corredor (periostitis/shin splints, fascitis plantar, rodilla de corredor), reduce el impacto: menos series en pista, sustituye parte del volumen por bici o elíptica.`;
