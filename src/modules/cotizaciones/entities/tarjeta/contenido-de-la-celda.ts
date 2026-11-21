// Lo que muestra una celda de la tarjeta, resuelto en texto: un texto literal por renglones, un dato (`valor-del-dato.ts`), el logo, la foto del asesor (quien
// mira) o nada. Una lista de respaldo o unas condiciones se resuelven antes con la cotización (`condiciones-de-la-celda.ts`).
import type { ContenidoResuelto } from './condiciones-de-la-celda'
import { inicialesDe } from './contexto-de-la-cotizacion'
import {
  datoDibujado,
  textoDibujado,
  type ContenidoDibujado,
  type EntradaDelContenido,
} from './valor-del-dato'

export {
  aplica,
  esElTotal,
  SIN_DATO,
  valorDelNodo,
  type ContenidoDibujado,
  type EntradaDelContenido,
  type MontoDibujado,
} from './valor-del-dato'

// Recibe la celda ya resuelta (`resolverElContenido()`): la geometría la resuelve una vez y la usa también para su marca.
export function contenidoDibujado(e: EntradaDelContenido, c: ContenidoResuelto): ContenidoDibujado {
  switch (c.tipo) {
    case 'texto':
      return textoDibujado(c.texto)
    case 'vacio':
      return { tipo: 'vacio' }
    case 'logo':
      return e.contexto.logo === null ? { tipo: 'vacio' } : { tipo: 'logo' }
    case 'foto_del_asesor': {
      const asesor = e.contexto.asesor
      return asesor === null
        ? { tipo: 'vacio' }
        : {
            tipo: 'foto_del_asesor',
            url: asesor.foto,
            iniciales: inicialesDe(asesor.nombre),
            nombre: asesor.nombre,
          }
    }
    case 'dato':
      return datoDibujado(e, c)
  }
}
