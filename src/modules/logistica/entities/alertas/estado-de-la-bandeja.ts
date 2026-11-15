import type { Resultado } from '@/shared/lib/errores'
import type { LecturaDelGrupo } from './grupo-leido'
import { TITULO_DE_LOS_GRUPOS, type GrupoDeLaBandeja } from './grupos'

// Qué dibuja la bandeja del día a partir de lo que leyó cada grupo: nada pendiente (todos leídos y vacíos), o los grupos que tienen algo, cada uno con su lectura o su error. Un error de un
// grupo se aísla (no tumba a los demás) y un grupo vacío se pliega: no se dibuja. Puro: ninguna lectura.

export type GrupoDeLaBandejaLeido = {
  grupo: GrupoDeLaBandeja
  resultado: Resultado<LecturaDelGrupo>
}

export type GrupoParaDibujar =
  | { estado: 'filas'; grupo: GrupoDeLaBandeja; titulo: string; lectura: LecturaDelGrupo }
  | { estado: 'error'; grupo: GrupoDeLaBandeja; titulo: string }

export type EstadoDeLaBandeja = { tipo: 'vacia' } | { tipo: 'grupos'; grupos: GrupoParaDibujar[] }

export function estadoDeLaBandeja(leidos: readonly GrupoDeLaBandejaLeido[]): EstadoDeLaBandeja {
  const grupos: GrupoParaDibujar[] = []
  for (const { grupo, resultado } of leidos) {
    const titulo = TITULO_DE_LOS_GRUPOS[grupo]
    if (!resultado.ok) {
      grupos.push({ estado: 'error', grupo, titulo })
    } else if (resultado.data.filas.length > 0) {
      grupos.push({ estado: 'filas', grupo, titulo, lectura: resultado.data })
    }
  }
  return grupos.length === 0 ? { tipo: 'vacia' } : { tipo: 'grupos', grupos }
}
