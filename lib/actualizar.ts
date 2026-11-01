import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Tras guardar o borrar algo: vuelve a pintar la pantalla actual y vacía la caché de pantallas
 * del navegador, para que al ir a otra (o volver atrás) se vea ya el cambio sin pulsar F5.
 */
export function actualizarPantallas() {
  revalidatePath("/", "layout");
}
