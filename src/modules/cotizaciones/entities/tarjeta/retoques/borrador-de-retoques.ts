// El borrador del modo «Retocar» de la tarjeta: lo que la persona va cambiando antes de «Listo», como un reductor puro. Empieza de los retoques guardados que
// aplican; el campo de una celda escribe en el borrador mientras se tipea (así «Listo» lleva lo tipeado) y Esc lo deja como estaba al abrirlo.
import {
  MAXIMO_DE_CARACTERES_DE_UN_RETOQUE,
  type RetoquesDeLaTarjeta,
} from '../../cuadricula-de-la-tarjeta'
import { caracteres, clavesEnOrdenC } from '../../json-de-la-base'

export type BorradorDeRetoques = {
  readonly celdas: Readonly<Record<string, string>>
  readonly filas_ocultas: readonly string[]
}

// Lo elegido: una celda de texto con su campo abierto (y el texto que tenía en el borrador al abrirlo) o una fila (con la celda sin texto que se tocó para
// elegirla, si fue así).
export type ElegidaDelModo =
  | { readonly tipo: 'celda'; readonly id: string; readonly antes: string | undefined }
  | { readonly tipo: 'fila'; readonly id: string; readonly celda?: string }
  | null

export type EstadoDelModo = {
  readonly retocando: boolean
  readonly borrador: BorradorDeRetoques
  readonly elegida: ElegidaDelModo
}

export type AccionDelModo =
  | { tipo: 'empezar'; aplican: RetoquesDeLaTarjeta | null }
  | { tipo: 'salir' }
  | { tipo: 'elegir_celda'; id: string }
  | { tipo: 'escribir'; id: string; texto: string }
  | { tipo: 'dejar' }
  | { tipo: 'cancelar_campo' }
  | { tipo: 'elegir_fila'; id: string; celda?: string }
  | { tipo: 'alternar_fila'; id: string }

const VACIO: BorradorDeRetoques = { celdas: {}, filas_ocultas: [] }

export const MODO_INICIAL: EstadoDelModo = { retocando: false, borrador: VACIO, elegida: null }

const textoDe = (b: BorradorDeRetoques, id: string): string | undefined =>
  Object.hasOwn(b.celdas, id) ? b.celdas[id] : undefined

function conTexto(
  b: BorradorDeRetoques,
  id: string,
  texto: string | undefined,
): BorradorDeRetoques {
  const celdas = Object.fromEntries(Object.entries(b.celdas).filter(([k]) => k !== id))
  return { ...b, celdas: texto === undefined ? celdas : { ...celdas, [id]: texto } }
}

const alternar = (lista: readonly string[], id: string) =>
  lista.includes(id) ? lista.filter((f) => f !== id) : [...lista, id]

type Paso<T extends AccionDelModo['tipo']> = (
  e: EstadoDelModo,
  a: Extract<AccionDelModo, { tipo: T }>,
) => EstadoDelModo

// Un paso por acción (sin un `switch` largo).
const PASOS: { readonly [T in AccionDelModo['tipo']]: Paso<T> } = {
  empezar: (_e, a) => ({
    retocando: true,
    borrador: { celdas: a.aplican?.celdas ?? {}, filas_ocultas: a.aplican?.filas_ocultas ?? [] },
    elegida: null,
  }),
  salir: () => MODO_INICIAL,
  elegir_celda: (e, a) => ({
    ...e,
    elegida: { tipo: 'celda', id: a.id, antes: textoDe(e.borrador, a.id) },
  }),
  escribir: (e, a) => ({ ...e, borrador: conTexto(e.borrador, a.id, a.texto) }),
  dejar: (e) => ({ ...e, elegida: null }),
  cancelar_campo: (e) =>
    e.elegida?.tipo === 'celda'
      ? { ...e, borrador: conTexto(e.borrador, e.elegida.id, e.elegida.antes), elegida: null }
      : { ...e, elegida: null },
  elegir_fila: (e, a) => ({
    ...e,
    elegida: { tipo: 'fila', id: a.id, ...(a.celda === undefined ? {} : { celda: a.celda }) },
  }),
  alternar_fila: (e, a) => ({
    ...e,
    borrador: { ...e.borrador, filas_ocultas: alternar(e.borrador.filas_ocultas, a.id) },
  }),
}

export function modoDeRetoques(e: EstadoDelModo, a: AccionDelModo): EstadoDelModo {
  const paso = PASOS[a.tipo] as Paso<typeof a.tipo>
  return paso(e, a as never)
}

// La primera celda (en orden C) con más de 300 caracteres: «Listo» se apaga con su motivo.
export function primerTextoLargo(b: BorradorDeRetoques): string | null {
  return (
    clavesEnOrdenC(b.celdas).find(
      (id) => caracteres(b.celdas[id] ?? '') > MAXIMO_DE_CARACTERES_DE_UN_RETOQUE,
    ) ?? null
  )
}
