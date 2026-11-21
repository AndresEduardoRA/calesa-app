// La cotización privada (glosario: «Cotización privada»): la marca la pone y la quita sólo quien la creó; la ven ella y quien tiene `cotizaciones.privadas.ver` de su origen.
// Quién la ve lo decide la base (la policy «cotizaciones: leer» y sus copias); esto dice sólo qué ofrece la pantalla y con qué textos, sin I/O. Es del núcleo: lo usan la
// hoja nueva (el interruptor), la guardada y el listado (la línea del «⋯» y la insignia) y las áreas `aprobada` y `final` (el aviso de que deja de ser privada).

import type { Resultado } from '@/shared/lib/errores'

export const ETIQUETA_DE_PRIVADA = 'Privada'
export const AYUDA_DEL_INTERRUPTOR = 'Sólo la ves tú y quien puede ver las privadas de este origen.'
export const AVISO_AL_APROBAR =
  'Al aprobarla deja de ser privada: la verá todo el que ve las cotizaciones de su origen.'
export const AVISO_AL_MARCAR_FINAL =
  'Al marcarla final deja de ser privada: la verá todo el que ve las cotizaciones de su origen.'

// Los motivos de la base (23514 de `cotizacion_privada_cambiar()`), los mismos textos: la línea del «⋯» los dice antes de intentarlo.
export const MOTIVO_PRIVADA_FINAL = 'Una final no se hace privada.'
export const MOTIVO_PRIVADA_APROBADA = 'Es la aprobada de su vehículo: no se hace privada.'
export const MOTIVO_PRIVADA_SIN_GUARDAR = 'Guarda los cambios primero.'

// La causa de un rechazo de `cotizacion_aprobar()` sin `p_hacerla_publica` sobre una privada (22023, `hint privada`): la pantalla pregunta antes de aprobarla.
export const CAUSA_PRIVADA = 'privada'

export type ClaveDePrivada = 'hacer-privada' | 'hacer-publica'
export type OfertaDePrivada = { clave: ClaveDePrivada; motivo: string | null }

export type DatosDeLaPrivada = {
  creadoPor: string
  // Quien mira de verdad (con «Ver como», la persona real: la base decide por ella).
  usuarioId: string
  clase: 'preventa' | 'final'
  // Si es la aprobada de su vehículo; nulo si no se sabe (la lectura de la marca falló): entonces la base decide al intentarlo.
  aprobada: boolean | null
  privada: boolean
}

// Qué ofrece el «⋯» sobre la marca: nada a quien no la creó; a quien la creó, «Hacer pública» si es privada y «Hacer privada» si no, apagada con su motivo si es una final
// o la aprobada de su vehículo (la base diría lo mismo).
export function ofertaDePrivada(d: DatosDeLaPrivada): OfertaDePrivada | null {
  if (d.creadoPor !== d.usuarioId) return null
  if (d.privada) return { clave: 'hacer-publica', motivo: null }
  if (d.clase === 'final') return { clave: 'hacer-privada', motivo: MOTIVO_PRIVADA_FINAL }
  if (d.aprobada === true) return { clave: 'hacer-privada', motivo: MOTIVO_PRIVADA_APROBADA }
  return { clave: 'hacer-privada', motivo: null }
}

// Lo que devuelve `cotizacion_privada_cambiar()`: si cambió (o ya estaba así) y la versión nueva (el texto de la base: nunca pasa por `Date`).
export type ResultadoDePrivada = { cambiada: boolean; privada: boolean; actualizadoEn: string }

// Hacerla privada o pública, dicho como interfaz (la implementación, `infra/privada.ts`, la entrega `areas/nucleo/composicion.ts`). La base mira todo: verla, ser
// quien la creó, la versión, una final y la aprobada.
export type CambiadorDePrivada = (pedido: {
  id: string
  privada: boolean
  actualizadoEn: string
}) => Promise<Resultado<ResultadoDePrivada>>

// El aviso al entrar: «La n.º N es privada.» o «… es pública.».
export function avisoDePrivada(numero: number, privada: boolean): string {
  return `La n.º ${String(numero)} es ${privada ? 'privada' : 'pública'}.`
}
