import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { FalloDeOportunidad } from '../../../entities/repositorios-de-oportunidades'

// Lo que vuelve del repositorio de oportunidades, dicho como resultado de una action: el motivo junto a su campo y, si el rechazo es de
// «una abierta por lead y embudo», el id de la abierta (`abierta`), que el navegador lee con `abiertaDelRechazo()` para ofrecer «Abrir esa».
export function comoResultadoDeOportunidad<T>(
  resultado: { ok: true; data: T } | FalloDeOportunidad,
): ResultadoDeAccion<T> & { abierta?: string } {
  if (resultado.ok) {
    return resultado
  }
  const { campo, error, abierta } = resultado
  return {
    ok: false,
    error,
    ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}),
    ...(abierta ? { abierta } : {}),
  }
}
