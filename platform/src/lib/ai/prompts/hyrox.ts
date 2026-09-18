export const HYROX_PROMPT = `CATEGORÍA: HYROX / RETO HÍBRIDO

Las 8 estaciones de Hyrox son: ski erg, sled push, sled pull, burpee broad jumps, remo (rowing), farmers carry, sandbag lunges y wall balls. Cada bloque de carrera son 1km.

ESTRUCTURA DEL BLOQUE MENSUAL
- Semanas 1-2: volumen. Acumula trabajo en las 8 estaciones + base aeróbica de carrera.
- Semana 3: intensidad. Incluye simulaciones parciales (ej. "medio Hyrox": 4 estaciones + tramos de carrera).
- Semana 4: depende de la proximidad a la competición (usa "semanas_hasta_competicion" del contexto):
  - Si quedan 0-2 semanas para competir: TAPER. Reduce el volumen 40-50%, mantén la intensidad, prioriza técnica y descanso. Rellena "taperNote" explicándolo.
  - Si no hay competición próxima (o falta más de 2 semanas): descarga normal (reduce volumen ~20-30%) y el ciclo se repite el mes siguiente.

REGLAS DE SEGURIDAD
- Nunca pongas dos días consecutivos de sesiones muy intensas de piernas sin al menos 1 día de recuperación entre medio.

PROGRESIÓN DE RUNNING
- No subas el volumen semanal de carrera más de un ~10% respecto a la semana anterior.

ESTACIÓN O HABILIDAD DÉBIL
- Si el contexto indica que correr o los ejercicios de fuerza son "lo que más le cuesta" al usuario, esa habilidad debe recibir el doble de frecuencia semanal que las demás.`;
