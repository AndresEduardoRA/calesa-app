import type { ClaveDePaso, PasoConDestino } from '@/modules/origenes'

// Lo que falta, en el inicio de Configuración: los siguientes pasos de cada origen activo, en la tarjeta de la sección donde se resuelven.
// Sólo lo que la persona puede hacer (el paso con pantalla y sin motivo para no poder). El paso «Revisa los permisos» no va: es un aviso
// blando (los roles para todos los orígenes ya alcanzan al origen) y sigue en la página del origen.
export type SeccionConFaltas = 'cotizacion' | 'flujos' | 'empresa'

export const SECCION_DEL_PASO: Record<ClaveDePaso, SeccionConFaltas | null> = {
  formula: 'cotizacion',
  flujo: 'flujos',
  apibara: 'empresa',
  permisos: null,
}

export type Falta = { clave: string; texto: string; ruta: string }

export type FaltasPorSeccion = Partial<Record<SeccionConFaltas, Falta[]>>

// Cuántas faltas se dibujan por tarjeta; del resto se dice cuántas más.
export const TOPE_DE_FALTAS = 3

export type PasosDeUnOrigen = {
  origen: { id: string; nombre: string; activo: boolean }
  pasos: readonly PasoConDestino[]
}

function textoDe(clave: ClaveDePaso, nombre: string): string {
  switch (clave) {
    case 'formula':
      return `Falta publicar la fórmula de ${nombre}`
    case 'flujo':
      return `Falta configurar el flujo de ${nombre}`
    case 'apibara':
      return 'Falta activar apibara'
    case 'permisos':
      return `Faltan los permisos de ${nombre}`
  }
}

export function faltasPorSeccion(origenes: readonly PasosDeUnOrigen[]): FaltasPorSeccion {
  const faltas: FaltasPorSeccion = {}
  for (const { origen, pasos } of origenes) {
    if (!origen.activo) {
      continue
    }
    for (const paso of pasos) {
      const seccion = SECCION_DEL_PASO[paso.clave]
      if (!seccion || !paso.pendiente || paso.ruta === null || paso.motivoDeshabilitado !== null) {
        continue
      }
      const lista = (faltas[seccion] ??= [])
      // apibara es de la empresa, no de cada subasta: una sola vez.
      const clave = paso.clave === 'apibara' ? 'apibara' : `${paso.clave}-${origen.id}`
      if (lista.some((falta) => falta.clave === clave)) {
        continue
      }
      lista.push({ clave, texto: textoDe(paso.clave, origen.nombre), ruta: paso.ruta })
    }
  }
  return faltas
}
