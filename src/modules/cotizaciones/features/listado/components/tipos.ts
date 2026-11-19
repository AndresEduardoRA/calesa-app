import type { ComponentType, ReactNode } from 'react'
import type { CotizacionDelListado } from '../../../entities/listado/filas-del-listado'
import type { EntradaDelListado } from '../../../entities/listado/grupos-del-listado'
import type { AnchoDeLaPortada } from '../../../entities/ruta-de-la-hoja'

export type FilaDeCotizacion = CotizacionDelListado

// Una entrada de la lista (un grupo o una cotización sola) con los nombres de su cotización.
export type EntradaDeLaLista = EntradaDelListado<FilaDeCotizacion>

// El «⋯» de una fila o una tarjeta: lo dibuja quien compone la pantalla (`src/app`, que une lo de cada área); sin él, sin menú. Devuelve nulo si la fila no tiene qué
// ofrecer. `sinCompartir`: la tarjeta de la lista y el resumen ya tienen «Compartir» a la vista y su «⋯» no lo repite. `conBorde`: junto a botones (la barra del
// resumen), con borde y de su alto.
export type MenuDeFila = (
  fila: FilaDeCotizacion,
  opciones?: { sinCompartir?: boolean; conBorde?: boolean },
) => ReactNode

// «Compartir» de una cotización (abre el panel de compartir), o nulo si no se ofrece: sin la oferta del «⋯» o en Modo Live.
export type CompartirDe = (fila: FilaDeCotizacion) => (() => void) | null

// Un origen con el que se nombra a una fila (los de `cotizaciones.ver` de quien mira), con su color (la insignia de la tarjeta).
export type OrigenDelListado = { id: string; nombre: string; color: string | null }

// La portada de una cotización en la tarjeta de la lista (la del área `tarjeta`, por hueco: el listado no la importa).
export type PortadaDeLaFila = ComponentType<{
  cotizacionId: string
  numero: number
  total: { valor: number; moneda?: string | null } | null
  ancho: AnchoDeLaPortada
  recorte: 'cubrir'
  lugar: 'lista'
}>

// Las casillas y «Comparar» de un grupo desplegado (las del área `aprobada`, por hueco). Lleva el estado de las elegidas: dibuja cada línea con su casilla
// (`linea(fila, casilla)`) y, al pie, «Comparar» con su ayuda.
export type PropsDeCompararDelGrupo = {
  filas: readonly { id: string; numero: number }[]
  // La página de donde se vino (`returnTo` de «Comparar cotizaciones»).
  volverA: string
  linea: (fila: { id: string; numero: number }, casilla: ReactNode) => ReactNode
}
export type CompararDelGrupo = ComponentType<PropsDeCompararDelGrupo>

// Lo que otras áreas llenan en la lista: la portada de cada tarjeta y «Comparar» de un grupo. Sin ellos, la tarjeta va sin portada y el grupo sin casillas.
export type HuecosDeLaLista = {
  Portada?: PortadaDeLaFila | undefined
  Comparar?: CompararDelGrupo | undefined
}

// La proporción del marco de la portada en la tarjeta de la lista: la de la tarjeta de la cotización (960 × 512), la misma que `PROPORCION_DE_LA_PORTADA` del área
// `tarjeta` (el listado no la importa).
export const PROPORCION_EN_LA_LISTA = 15 / 8

// El nombre de una fila que no se ve (o no tiene) se dibuja «—», sin distinguir un caso del otro.
export const SIN_NOMBRE = '—'

export function nombreDelOrigen(origenes: readonly OrigenDelListado[], id: string): string {
  return origenes.find((origen) => origen.id === id)?.nombre ?? SIN_NOMBRE
}

export function origenDe(
  origenes: readonly OrigenDelListado[],
  id: string,
): OrigenDelListado | null {
  return origenes.find((origen) => origen.id === id) ?? null
}
