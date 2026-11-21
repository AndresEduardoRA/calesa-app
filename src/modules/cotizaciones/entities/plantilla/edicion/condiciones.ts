// Una condición de la tarjeta a medio armar en el editor (glosario: «Condición (de la tarjeta)»): lo que mira (un dato o un nodo), qué pregunta y su número u
// opción, tal como se tipea. El panel la guarda así, con huecos, y sólo manda a la cuadrícula lo que `condicionCompleta()` arma; lo que falta queda con su motivo en
// su lugar. Qué se puede preguntar lo dice `operadoresPara()` con el contexto de la fórmula: así el editor nunca arma una condición que la fórmula no puede
// responder (`condicion_invalida`). El número se lee y se escribe con el locale de la empresa, como en la XCell. Puro.
import { formatearParaEditar } from '@/shared/lib/formato'
import { avisoDeNumero, leerNumeroTipeado } from '@/shared/lib/numero-tipeado'
import {
  ES_CON_NUMERO,
  ES_SOBRE_UN_DATO,
  VARIABLES_DE_LA_TARJETA,
  type CondicionDeLaTarjeta,
  type ContenidoDeLaCelda,
  type DatoDeLaCelda,
  type EsDeLaCondicion,
} from '../../cuadricula-de-la-tarjeta'
import type { NodoParaPlantilla } from '../nodos-de-plantilla'
import type { ContextoDePlantilla } from '../validar-plantilla'

export const MOTIVOS_DE_LAS_CONDICIONES = {
  dosDatos: 'Elige al menos dos datos.',
  dato: 'Elige el dato.',
  numero: 'Falta el número.',
  opcion: 'Elige la opción.',
} as const

// Por qué no se puede sumar otro: el motivo junto al botón apagado.
export const TOPES_DE_LAS_CONDICIONES = {
  datos: 'Hasta 5 datos.',
  condiciones: 'Hasta 3 condiciones.',
  ramas: 'Hasta 5 ramas con el «si no».',
} as const

// Por qué no se puede quitar otro: el motivo en la línea apagada del «⋯».
export const MINIMOS_DE_LAS_CONDICIONES = {
  datos: 'La lista lleva al menos dos datos.',
  ramas: 'Queda al menos una rama.',
  condiciones: 'Queda al menos una condición.',
} as const

export type CondicionEnBorrador = {
  // Lo que mira: una variable de la cotización o un nodo (con lo que muestra: lo pregunta «está vacío»).
  readonly sobre: DatoDeLaCelda | null
  readonly es: EsDeLaCondicion | null
  // El número tal como se tipeó (es mayor, menor o igual a).
  readonly numero: string
  readonly opcion: string | null
}

export const CONDICION_VACIA: CondicionEnBorrador = {
  sobre: null,
  es: null,
  numero: '',
  opcion: null,
}

// Los motivos de lo que falta, por lugar: `datos.1`, `ramas.0.si.2.numero`, `ramas.1.contenido`, `si_no`, `si.0.sobre`.
export type Motivos = ReadonlyMap<string, string>
export type Completado<T> =
  { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly motivos: Motivos }

const SOBRE_UN_NODO: readonly EsDeLaCondicion[] = [
  ...ES_SOBRE_UN_DATO,
  'cero',
  'no_cero',
  ...ES_CON_NUMERO,
]

const nodoDe = (contexto: ContextoDePlantilla, id: string): NodoParaPlantilla | undefined =>
  (contexto.definicion.nodos ?? []).find((n) => n.id === id)

// Qué se puede preguntar de lo elegido: de una variable, si está vacía; de la variante, su opción; de un interruptor (`bandera`), si está encendido o apagado; de otro
// nodo, si está vacío, si es 0 o cómo es contra un número.
export function operadoresPara(
  sobre: DatoDeLaCelda | null,
  contexto: ContextoDePlantilla,
): EsDeLaCondicion[] {
  if (sobre === null) return []
  if ('variable' in sobre) return [...ES_SOBRE_UN_DATO]
  const tipo = nodoDe(contexto, sobre.nodo)?.tipo
  if (tipo === 'opcion') return ['opcion']
  if (tipo === 'bandera') return ['encendido', 'apagado']
  return [...SOBRE_UN_NODO]
}

// Las opciones de la variante, si es lo elegido.
export const opcionesPara = (
  sobre: DatoDeLaCelda | null,
  contexto: ContextoDePlantilla,
): readonly { readonly clave: string; readonly titulo: string }[] =>
  sobre === null || 'variable' in sobre ? [] : (nodoDe(contexto, sobre.nodo)?.opciones ?? [])

// Elegir lo que mira: la pregunta sigue si el nuevo la admite (si no, la primera que admite) y la opción, si es de la variante.
export function conSobre(
  c: CondicionEnBorrador,
  sobre: DatoDeLaCelda,
  contexto: ContextoDePlantilla,
): CondicionEnBorrador {
  const operadores = operadoresPara(sobre, contexto)
  const es = c.es !== null && operadores.includes(c.es) ? c.es : (operadores[0] ?? null)
  const opciones = opcionesPara(sobre, contexto)
  const opcion =
    es !== 'opcion'
      ? null
      : opciones.some((o) => o.clave === c.opcion)
        ? c.opcion
        : (opciones[0]?.clave ?? null)
  return { sobre, es, numero: c.numero, opcion }
}

// El número tipeado, o el motivo: vacío, «Falta el número.»; mal escrito, el aviso de la XCell.
export function numeroDe(texto: string, locale: string): number | string {
  const leido = leerNumeroTipeado(texto, locale)
  if (!leido.ok) return avisoDeNumero(texto, leido.motivo, locale)
  return leido.valor ?? MOTIVOS_DE_LAS_CONDICIONES.numero
}

const conNumero = (es: EsDeLaCondicion): es is (typeof ES_CON_NUMERO)[number] =>
  (ES_CON_NUMERO as readonly string[]).includes(es)

const ES_SOBRE_UN_DATO_SET: ReadonlySet<EsDeLaCondicion> = new Set(ES_SOBRE_UN_DATO)

// Lo que mira y qué pregunta, si están y van juntos (una variable sólo se pregunta si está vacía).
function sobreYEs(c: CondicionEnBorrador): { sobre: DatoDeLaCelda; es: EsDeLaCondicion } | null {
  const { sobre, es } = c
  if (sobre === null || es === null) return null
  return ES_SOBRE_UN_DATO_SET.has(es) || 'nodo' in sobre ? { sobre, es } : null
}

// La condición que va a la cuadrícula, o nula con su motivo en `motivos` (en `<lugar>.sobre`, `.numero` u `.opcion`).
export function condicionCompleta(
  c: CondicionEnBorrador,
  locale: string,
  lugar: string,
  motivos: Map<string, string>,
): CondicionDeLaTarjeta | null {
  const elegido = sobreYEs(c)
  if (elegido === null) {
    motivos.set(`${lugar}.sobre`, MOTIVOS_DE_LAS_CONDICIONES.dato)
    return null
  }
  const { sobre, es } = elegido
  if (es === 'vacio' || es === 'no_vacio') return { es, dato: sobre }
  const nodo = 'nodo' in sobre ? sobre.nodo : ''
  if (es === 'opcion') {
    if (c.opcion !== null && c.opcion !== '') return { es, nodo, opcion: c.opcion }
    motivos.set(`${lugar}.opcion`, MOTIVOS_DE_LAS_CONDICIONES.opcion)
    return null
  }
  if (!conNumero(es)) return { es, nodo }
  const a = numeroDe(c.numero, locale)
  if (typeof a === 'number') return { es, nodo, a }
  motivos.set(`${lugar}.numero`, a)
  return null
}

// Una condición de la cuadrícula, para editarla: una sobre un nodo lo mira por su monto; el número, como se escribe en el locale.
export function borradorDeLaCondicion(
  c: CondicionDeLaTarjeta,
  locale: string,
): CondicionEnBorrador {
  if ('dato' in c) return { ...CONDICION_VACIA, sobre: c.dato, es: c.es }
  return {
    sobre: { tipo: 'dato', nodo: c.nodo, mostrar: 'monto' },
    es: c.es,
    numero: 'a' in c ? formatearParaEditar(c.a, { locale }) : '',
    opcion: 'opcion' in c ? c.opcion : null,
  }
}

const VARIABLES: ReadonlySet<string> = new Set(VARIABLES_DE_LA_TARJETA)

// Un dato que la fórmula de trabajo ya no tiene (un nodo que se borró) o una variable que no existe: la tarjeta lo salta y el editor lo dice.
export const datoQueYaNoEsta = (d: DatoDeLaCelda, contexto: ContextoDePlantilla): boolean =>
  'variable' in d ? !VARIABLES.has(d.variable) : nodoDe(contexto, d.nodo) === undefined

// El primer dato de un contenido: el suyo, el primero de su lista o el primero que muestran sus ramas y su «si no». Lo que queda al pasar a «Uno».
export function primerDato(c: ContenidoDeLaCelda | null): DatoDeLaCelda | null {
  if (c === null) return null
  if (c.tipo === 'dato') return c
  if (c.tipo === 'respaldo') return c.datos[0] ?? null
  if (c.tipo !== 'condiciones') return null
  const simples = [...c.ramas.map((r) => r.contenido), c.si_no]
  return simples.find((s): s is DatoDeLaCelda => s.tipo === 'dato') ?? null
}
