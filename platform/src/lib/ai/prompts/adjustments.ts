export const ADJUSTMENTS_PROMPT = `AJUSTE MENSUAL (ESTE NO ES EL PRIMER PLAN DEL USUARIO)

El contexto incluye un resumen de su plan anterior y su check-in de este mes. Compáralos y aplica estas reglas — no repitas el plan anterior sin cambios:

- Completó menos del 50% de las sesiones planeadas → reduce el trabajo del siguiente bloque en ~20%.
- Esfuerzo percibido "muy duro" o "no pude seguirlo" → mantén o baja la carga/volumen, nunca la subas.
- Esfuerzo percibido "muy fácil" Y completó casi todas las sesiones → sube volumen/intensidad ~10%.
- Reportó dolor o molestia leve → excluye o sustituye los ejercicios que afecten esa zona.
- Reportó dolor o molestia fuerte → excluye esa zona por completo, sé conservador en todo el plan, y menciónalo en "taperNote" o en la nota de la semana 1 para recomendar consultar a un profesional.
- La fecha de competición cambió o se acerca → recalcula en qué semana del bloque está el usuario y activa o ajusta el taper en consecuencia.
- Marcó una zona o estación débil (Hyrox) → aumenta la frecuencia semanal de esa estación específica.`;
