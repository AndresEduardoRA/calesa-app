// Los mutadores cruzados del aspecto (corpus de `validar_diseno()`): uno válido, que pone aspecto al azar en la cabecera, una sección o un ítem
// (las escalas de `entities/diseno.ts` y, de color, un tono del contexto), y uno que nombra un tono que el catálogo no tiene desde la cabecera o
// una sección (`tono_inexistente`, tras los grupos).
import {
  ASPECTO_POR_DEFECTO,
  DENSIDADES_DE_SECCION,
  ENFASIS,
  LETRAS,
  RELLENOS,
  SEPARACIONES,
} from '@/modules/cotizaciones/entities/diseno'
import {
  itemsDe,
  raiz,
  secciones,
  type Entrada,
  type MutadorDeDiseno,
} from './mutadores-de-diseno-base'
import { elegir, esObjeto, type Azar, type Json, type Objeto } from './mutadores-de-formula'

const entre = (azar: Azar, desde: number, hasta: number) => desde + azar.entero(hasta - desde + 1)
const uno = <T extends Json>(azar: Azar, valores: readonly T[]): T =>
  elegir(azar, [...valores]) ?? (valores[0] as T)
const cabecera = (e: Entrada): Objeto | undefined => {
  const c = raiz(e)?.['cabecera']
  return esObjeto(c) ? c : undefined
}

function aspectoDeSeccion(o: Objeto, e: Entrada, azar: Azar): string {
  o['ancho'] = entre(azar, 1, 12)
  o['alto'] = entre(azar, 1, 4)
  o['relleno'] = uno(azar, RELLENOS)
  o['separacion'] = uno(azar, SEPARACIONES)
  o['densidad'] = uno(azar, DENSIDADES_DE_SECCION)
  o['letra'] = uno(azar, LETRAS)
  o['enfasis'] = uno(azar, ENFASIS)
  const tono = elegir(azar, e.contexto.tonos)
  if (tono !== undefined) o['tono'] = tono
  return 'seccion'
}

function aspectoDeItem(o: Objeto, azar: Azar): string {
  const columnas = entre(azar, 1, 12)
  o['ancho'] =
    o['tipo'] === 'celda' && azar.entero(3) === 0
      ? uno(azar, ['completo', 'mitad', 'tercio'] as const)
      : columnas
  o['alto'] = entre(azar, 1, 4)
  o['letra'] = uno(azar, LETRAS)
  o['enfasis'] = uno(azar, ENFASIS)
  return String(o['tipo'])
}

function aspectoDeCabecera(o: Objeto, e: Entrada, azar: Azar): string {
  o['relleno'] = uno(azar, RELLENOS)
  o['letra'] = uno(azar, LETRAS)
  o['enfasis'] = azar.entero(2) === 0 ? ASPECTO_POR_DEFECTO.enfasis : 'fuerte'
  const tono = elegir(azar, e.contexto.tonos)
  if (tono !== undefined) o['tono'] = tono
  return 'cabecera'
}

export const MUTADORES_DEL_ASPECTO: readonly MutadorDeDiseno[] = [
  {
    nombre: 'aspecto_al_azar',
    aplicar: (e, azar) => {
      const donde = azar.entero(3)
      const c = cabecera(e)
      if (donde === 0 && c) return `aspecto_al_azar(${aspectoDeCabecera(c, e, azar)})`
      const s = elegir(azar, secciones(e))
      if (donde === 1 && s) return `aspecto_al_azar(${aspectoDeSeccion(s, e, azar)})`
      const it = elegir(azar, itemsDe(e))?.it
      return it ? `aspecto_al_azar(${aspectoDeItem(it, azar)})` : null
    },
  },
  {
    nombre: 'tono_del_diseno_fuera_del_catalogo',
    aplicar: (e, azar) => {
      const fuera = 'fuera_del_catalogo'
      if (e.contexto.tonos.includes(fuera)) return null
      const c = cabecera(e)
      if (azar.entero(3) === 0 && c) {
        c['tono'] = fuera
        return 'tono_del_diseno_fuera_del_catalogo(cabecera)'
      }
      const s = elegir(azar, secciones(e))
      if (!s) return null
      s['tono'] = fuera
      return `tono_del_diseno_fuera_del_catalogo(${String(s['id'])})`
    },
  },
]
