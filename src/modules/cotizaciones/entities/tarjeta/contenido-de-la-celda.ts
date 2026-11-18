// Lo que muestra una celda de la tarjeta, resuelto en texto: un texto literal por renglones, una variable de la cotización, un dato de un nodo (su monto,
// etiqueta, descripción, porcentaje, tipo de cambio o plazo, D6, D8, D17 y D18 de T310), el logo o nada. Un dato de un nodo que no aplica queda vacío; un monto
// nulo, «—». Los montos con `formatearMonto()` (el texto de `<Monto>` y del PDF); en pantalla los tapa `<Monto>` en Modo Live.
import { formatearMonto, formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import type { CalculoDeLaTarjeta } from '../calculo-de-la-tarjeta'
import type { ContenidoDeLaCelda, Mostrar } from '../cuadricula-de-la-tarjeta'
import { valorDeLaVariable, type ContextoDeLaCotizacion } from './contexto-de-la-cotizacion'
import type { TarjetaLista, TipoDeCambioDeLaTarjeta } from './lectura-de-la-tarjeta'

export const SIN_DATO = '—'

export type MontoDibujado = { valor: number; moneda: string; texto: string }
export type ContenidoDibujado =
  | { tipo: 'texto'; lineas: string[] }
  | ({ tipo: 'monto'; segunda: MontoDibujado | null } & MontoDibujado)
  | { tipo: 'logo' }
  | { tipo: 'vacio' }

export type EntradaDelContenido = {
  tarjeta: TarjetaLista
  calculo: CalculoDeLaTarjeta
  contexto: ContextoDeLaCotizacion
  monedaBs: string | null
  locale: string
}

const texto = (t: string): ContenidoDibujado => ({
  tipo: 'texto',
  lineas: t === '' ? [] : t.split('\n'),
})
const numeroONulo = (v: unknown): number | null => (typeof v === 'number' ? v : null)

export const esElTotal = (e: EntradaDelContenido, nodo: string) => e.tarjeta.total.nodo === nodo

// El valor de un nodo: el del total sale de los totales (D6); el resto, del cálculo por su id.
export function valorDelNodo(e: EntradaDelContenido, nodo: string): unknown {
  return esElTotal(e, nodo) ? e.calculo.totales.usd : e.calculo.valores.get(nodo)
}

export const aplica = (e: EntradaDelContenido, nodo: string): boolean =>
  esElTotal(e, nodo) || e.calculo.estados === null || e.calculo.estados.get(nodo) === 'activo'

// El tipo de cambio del bucket del grupo del nodo: el del modo elegido o, sin modo (o uno que la lectura no nombra), el de omisión.
function tipoDeCambio(e: EntradaDelContenido, nodo: string): TipoDeCambioDeLaTarjeta | null {
  const grupo = e.tarjeta.nodos.get(nodo)?.grupo
  const bucket = grupo == null ? null : (e.tarjeta.grupos.get(grupo)?.bucket ?? null)
  if (bucket === null) return null
  const modo =
    e.calculo.modoTc === null ? undefined : e.tarjeta.tiposDeCambio.modos.get(e.calculo.modoTc)
  return (modo ?? e.tarjeta.tiposDeCambio.buckets).get(bucket) ?? null
}

function monto(e: EntradaDelContenido, nodo: string): ContenidoDibujado {
  const valor = numeroONulo(valorDelNodo(e, nodo))
  if (valor === null) return texto(SIN_DATO)
  const { calculo, monedaBs, locale } = e
  const bs = calculo.totales.bs
  const segunda =
    esElTotal(e, nodo) && calculo.verTotalBs && monedaBs !== null && bs !== null
      ? { valor: bs, moneda: monedaBs, texto: formatearMonto(bs, { moneda: monedaBs, locale }) }
      : null
  return {
    tipo: 'monto',
    valor,
    moneda: 'USD',
    texto: formatearMonto(valor, { moneda: 'USD', locale }),
    segunda,
  }
}

const numeroDe = (e: EntradaDelContenido, id: string | null | undefined): number | null =>
  id == null ? null : numeroONulo(e.calculo.valores.get(id))

// Lo que muestra un nodo, por `mostrar`.
const MOSTRADORES: {
  readonly [M in Mostrar]: (e: EntradaDelContenido, nodo: string) => ContenidoDibujado
} = {
  monto,
  etiqueta: (e, nodo) => texto(e.tarjeta.nodos.get(nodo)?.etiqueta ?? ''),
  descripcion: (e, nodo) => texto(e.tarjeta.nodos.get(nodo)?.descripcion ?? ''),
  porcentaje: (e, nodo) => {
    const v = numeroDe(e, e.tarjeta.nodos.get(nodo)?.pct)
    return texto(v === null ? SIN_DATO : formatearPorcentaje(v, { locale: e.locale }))
  },
  tc_nombre: (e, nodo) => texto(tipoDeCambio(e, nodo)?.nombre ?? ''),
  tc_valor: (e, nodo) => {
    const v = numeroDe(e, tipoDeCambio(e, nodo)?.nodo)
    return texto(v === null ? SIN_DATO : formatearNumero(v, { decimales: 4, locale: e.locale }))
  },
  plazo: (e, nodo) => {
    const grupo = e.tarjeta.nodos.get(nodo)?.grupo
    return texto(grupo == null ? '' : (e.tarjeta.grupos.get(grupo)?.plazo ?? ''))
  },
}

const delNodo = (e: EntradaDelContenido, nodo: string, mostrar: Mostrar): ContenidoDibujado =>
  aplica(e, nodo) ? MOSTRADORES[mostrar](e, nodo) : texto('')

// El título de la opción elegida de la variante; nulo sin variante o sin clave.
function tituloDeLaOpcion({ tarjeta, calculo }: EntradaDelContenido): string | null {
  if (tarjeta.variante === null) return null
  const clave = calculo.valores.get(tarjeta.variante.nodo)
  return tarjeta.variante.opciones.find((o) => o.clave === clave)?.titulo ?? null
}

export function contenidoDibujado(
  e: EntradaDelContenido,
  c: ContenidoDeLaCelda,
): ContenidoDibujado {
  switch (c.tipo) {
    case 'texto':
      return texto(c.texto)
    case 'vacio':
      return { tipo: 'vacio' }
    case 'logo':
      return e.contexto.logo === null ? { tipo: 'vacio' } : { tipo: 'logo' }
    case 'dato':
      if ('variable' in c) {
        const modo =
          e.calculo.modoTc === null ? null : (e.tarjeta.modos.get(e.calculo.modoTc) ?? null)
        return texto(
          valorDeLaVariable(c.variable, e.contexto, { tituloOpcion: tituloDeLaOpcion(e), modo }),
        )
      }
      return delNodo(e, c.nodo, c.mostrar)
  }
}
