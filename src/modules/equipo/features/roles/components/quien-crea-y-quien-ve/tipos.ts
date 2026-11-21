import type { FilaDelCuadro, ObjetivoDelCuadro } from '../../../../entities/cuadro-de-cotizaciones'
import type { RolConConcesiones } from '../../../../entities/rol'

// Lo que dibuja la fila de un rol, en la tabla o en la lista.
export type RolDelCuadro = {
  rol: RolConConcesiones
  fila: FilaDelCuadro
  // Una elección suya está viajando: la fila espera.
  ocupado: boolean
  // Por qué esta fila es sólo lectura, si hay que decirlo en ella (sin «Gestionar roles» se dice una vez arriba).
  motivo: string | null
}

export type AlCambiarDelCuadro = (rol: RolConConcesiones, objetivo: ObjetivoDelCuadro) => void
