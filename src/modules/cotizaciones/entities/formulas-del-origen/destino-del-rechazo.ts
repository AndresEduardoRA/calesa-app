// A dónde lleva un rechazo de `formula_del_origen_activar()`: el `hint` de la base (la causa del error) dice qué frenó, y el modal ofrece ir ahí (docs/UX.md).
// Un nodo abre la planilla con esa fila elegida; un lugar de la tarjeta, la tarjeta con «Ir a la celda»; la tarjeta, la
// planilla o el diseño, su sub-pestaña. Lo demás no tiene destino.
import type { Route } from 'next'
import { rutaDeLaFormula } from '@/shared/lib/rutas'
import { CLAVE_DE_LA_FILA_PEDIDA, CLAVE_DEL_LUGAR_PEDIDO } from '../llegada-al-editor'

export type DestinoDelRechazo = { etiqueta: string; ruta: Route }

const LUGAR_DE_LA_TARJETA = /^(celdas|filas|columnas)[.[]/
const DEL_DISENO = /^(diseno|secciones|cabecera|tarjeta_total|modos)(\.|$)/

function irAlLugar(lugar: string): string {
  if (lugar.startsWith('filas')) return 'Ir a la fila'
  if (lugar.startsWith('columnas')) return 'Ir a la columna'
  return 'Ir a la celda'
}

export function destinoDelRechazoDeActivar(
  causa: string | undefined,
  origenId: string,
  formulaId: string,
): DestinoDelRechazo | null {
  if (!causa) return null
  if (causa.startsWith('nodos.')) {
    const fila = causa.slice('nodos.'.length).split('.')[0] ?? ''
    if (fila === '') return null
    return {
      etiqueta: 'Ir a la fila',
      ruta: rutaDeLaFormula(origenId, formulaId, 'planilla', { [CLAVE_DE_LA_FILA_PEDIDA]: fila }),
    }
  }
  if (LUGAR_DE_LA_TARJETA.test(causa)) {
    return {
      etiqueta: irAlLugar(causa),
      ruta: rutaDeLaFormula(origenId, formulaId, 'tarjeta', { [CLAVE_DEL_LUGAR_PEDIDO]: causa }),
    }
  }
  if (causa === 'tarjeta') {
    return { etiqueta: 'Abrir la tarjeta', ruta: rutaDeLaFormula(origenId, formulaId, 'tarjeta') }
  }
  if (causa === 'formula') {
    return { etiqueta: 'Abrir la planilla', ruta: rutaDeLaFormula(origenId, formulaId, 'planilla') }
  }
  if (DEL_DISENO.test(causa)) {
    return { etiqueta: 'Abrir la hoja', ruta: rutaDeLaFormula(origenId, formulaId, 'hoja') }
  }
  return null
}
