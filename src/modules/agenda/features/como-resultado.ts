import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { FalloDeEscritura, ResultadoDeEscritura } from '../entities/escritura'

// Lo que vuelve del repositorio, dicho como resultado de una action: el motivo junto a su campo. Sin nada del navegador: lo usa también `darTareaVinculada`,
// que sale por `index.ts`.
export function comoResultado(
  resultado: { ok: true; data: ResultadoDeEscritura } | FalloDeEscritura,
): ResultadoDeAccion<ResultadoDeEscritura> {
  if (resultado.ok) {
    return resultado
  }
  const { campo, error } = resultado
  return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
}
