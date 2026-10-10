/**
 * Programa el reenvío a BMC tras enviar la respuesta al visitante.
 * `after()` de Next mantiene la tarea viva en el contenedor Node hasta que
 * termina; si no está disponible, se lanza sin esperar (el proceso es de larga vida).
 */
import { after } from "next/server";
import { forwardToBmc, type ForwardInput } from "@/lib/bmc-forms-forward";

export function forwardToBmcAfterResponse(input: ForwardInput): void {
  try {
    after(() => forwardToBmc(input));
  } catch {
    void forwardToBmc(input);
  }
}
