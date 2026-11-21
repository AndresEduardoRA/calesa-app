// Cómo se dicen en el editor un dato y una condición de la tarjeta: «Título de la cotización», «Remate · Etiqueta», «Remate es mayor que 1.000», «Variante es
// «A gasolina»». El nombre de un nodo es su etiqueta (o su id); el número, en el locale de la empresa. Puro.
import { formatearNumero } from '@/shared/lib/formato'
import type {
  CondicionDeLaTarjeta,
  DatoDeLaCelda,
  EsDeLaCondicion,
} from '../../cuadricula-de-la-tarjeta'
import type { ContextoDePlantilla } from '../validar-plantilla'
import { nombreDeLaVariable, nombreDeMostrar } from './datos-para-elegir'

// Qué pregunta cada condición, como sigue al nombre de lo que mira.
export const NOMBRES_DE_ES: Readonly<Record<EsDeLaCondicion, string>> = {
  vacio: 'está vacío',
  no_vacio: 'no está vacío',
  cero: 'es 0',
  no_cero: 'no es 0',
  mayor: 'es mayor que',
  menor: 'es menor que',
  igual: 'es igual a',
  opcion: 'es',
  encendido: 'está encendido',
  apagado: 'está apagado',
}

// Un número de una condición, como se lee: hasta 6 decimales.
const DECIMALES = 6

export function nombreDelNodo(nodo: string, contexto: ContextoDePlantilla): string {
  const n = (contexto.definicion.nodos ?? []).find((x) => x.id === nodo)
  return n?.etiqueta || nodo
}

// Una variable por su nombre; un nodo por su etiqueta y, si no es su monto, lo que muestra.
export function nombreDelDato(d: DatoDeLaCelda, contexto: ContextoDePlantilla): string {
  if ('variable' in d) return nombreDeLaVariable(d.variable)
  const nombre = nombreDelNodo(d.nodo, contexto)
  return d.mostrar === 'monto' ? nombre : `${nombre} · ${nombreDeMostrar(d.mostrar)}`
}

export function fraseDeLaCondicion(
  c: CondicionDeLaTarjeta,
  contexto: ContextoDePlantilla,
  locale: string,
): string {
  if ('dato' in c) return `${nombreDelDato(c.dato, contexto)} ${NOMBRES_DE_ES[c.es]}`
  const nombre = nombreDelNodo(c.nodo, contexto)
  if ('a' in c)
    return `${nombre} ${NOMBRES_DE_ES[c.es]} ${formatearNumero(c.a, { locale, decimales: DECIMALES })}`
  if ('opcion' in c) {
    const n = (contexto.definicion.nodos ?? []).find((x) => x.id === c.nodo)
    const titulo = (n?.opciones ?? []).find((o) => o.clave === c.opcion)?.titulo || c.opcion
    return `${nombre} es «${titulo}»`
  }
  return `${nombre} ${NOMBRES_DE_ES[c.es]}`
}
