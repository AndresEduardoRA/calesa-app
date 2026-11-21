// Lo que la tarjeta «Preferencias» de `/perfil` dice de cada preferencia, y las opciones que el modal ofrece. Sin I/O.
import { TAMANO_DE_PAGINA_POR_DEFECTO, type TamanoDePagina } from '@/shared/lib/paginacion'
import type { Densidad } from '@/shared/ui/densidad'
import type { Tema } from './preferencias'
import type { PreferenciaDeVistos } from './vistos'

export const OPCIONES_TEMA = [
  { valor: 'light', etiqueta: 'Claro' },
  { valor: 'dark', etiqueta: 'Oscuro' },
  { valor: 'system', etiqueta: 'Como el dispositivo' },
] as const satisfies readonly { valor: Tema; etiqueta: string }[]

export type OpcionDeDensidad = Densidad | 'automatica'

export const OPCIONES_DE_DENSIDAD = [
  { valor: 'automatica', etiqueta: 'Automática' },
  { valor: 'compacta', etiqueta: 'Compacta' },
  { valor: 'comoda', etiqueta: 'Cómoda' },
] as const satisfies readonly { valor: OpcionDeDensidad; etiqueta: string }[]

// `null` = el tema todavía no se conoce (vive en el navegador): no se inventa uno.
export function textoDelTema(tema: Tema | null): string | null {
  return OPCIONES_TEMA.find((opcion) => opcion.valor === tema)?.etiqueta ?? null
}

export function textoDeLaDensidad(preferencia: Densidad | null): string {
  return OPCIONES_DE_DENSIDAD.find((opcion) => opcion.valor === (preferencia ?? 'automatica'))!
    .etiqueta
}

// Sin elegir manda el de fábrica.
export function textoDeItemsPorPagina(preferencia: TamanoDePagina | null): string {
  return preferencia === null
    ? `${String(TAMANO_DE_PAGINA_POR_DEFECTO)} (de fábrica)`
    : String(preferencia)
}

// `zonaDeLaEmpresa` es la que manda sin elección propia.
export function textoDeLaZona(elegida: string | null, zonaDeLaEmpresa: string): string {
  return (elegida ?? `${zonaDeLaEmpresa} (la de la empresa)`).replaceAll('_', ' ')
}

export function textoDeVistos(vistos: PreferenciaDeVistos): string {
  if (!vistos.activado) {
    return 'No'
  }
  const recuerdo = vistos.dias === 365 ? '1 año' : `${String(vistos.dias)} días`
  return `Sí, ${recuerdo}`
}
