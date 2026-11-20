import type { ClaveDePaso } from '@/modules/origenes'
import type { PasoConDestino } from './origenes/pasos'

// Lo que falta, en el inicio de Configuración: una línea por origen activo con lo que le falta para cotizar y mover (los pasos de «Para
// cotizar y mover» que no están listos), en la tarjeta de Orígenes y enlazada a la primera pestaña que falla. apibara es de la empresa: va
// una sola vez, en la tarjeta de Empresa. Sólo lo que la persona puede hacer: un paso con motivo (sin el permiso en ese origen) no se dice.
export type SeccionConFaltas = 'origenes' | 'empresa'

export type Falta = { clave: string; texto: string; ruta: string }

export type FaltasPorSeccion = Partial<Record<SeccionConFaltas, Falta[]>>

// Cuántas faltas se dibujan por tarjeta; del resto se dice cuántas más.
export const TOPE_DE_FALTAS = 3

export type PasosDeUnOrigen = {
  origen: { id: string; nombre: string }
  // Los que no están listos, con su destino (`conDestino`).
  pasos: readonly PasoConDestino[]
}

const LO_QUE_FALTA: Record<Exclude<ClaveDePaso, 'datos'>, string> = {
  campos: 'activar sus campos',
  flujo: 'configurar el flujo',
  formula: 'activar una fórmula',
  tarjeta: 'publicar la tarjeta',
}

// «a», «a y b», «a, b y c». Cada parte es un infinitivo: «falta» concuerda con cualquier cantidad.
function enUnaFrase(partes: readonly string[]): string {
  if (partes.length <= 1) {
    return partes.join('')
  }
  return `${partes.slice(0, -1).join(', ')} y ${partes.at(-1) ?? ''}`
}

export function faltasPorSeccion(origenes: readonly PasosDeUnOrigen[]): FaltasPorSeccion {
  const faltas: FaltasPorSeccion = {}
  for (const { origen, pasos } of origenes) {
    const posibles = pasos.filter((paso) => paso.estado !== 'listo' && paso.motivo === null)
    const apibara = posibles.find((paso) => paso.clave === 'datos')
    if (apibara && !faltas.empresa?.some((falta) => falta.clave === 'apibara')) {
      ;(faltas.empresa ??= []).push({
        clave: 'apibara',
        texto: 'Falta activar apibara',
        ruta: apibara.ruta,
      })
    }
    const delOrigen = posibles.filter((paso) => paso.clave !== 'datos')
    const [primero] = delOrigen
    if (primero === undefined) {
      continue
    }
    const partes = delOrigen.map(
      (paso) => LO_QUE_FALTA[paso.clave as Exclude<ClaveDePaso, 'datos'>],
    )
    ;(faltas.origenes ??= []).push({
      clave: origen.id,
      texto: `${origen.nombre}: falta ${enUnaFrase(partes)}`,
      ruta: primero.ruta,
    })
  }
  return faltas
}
