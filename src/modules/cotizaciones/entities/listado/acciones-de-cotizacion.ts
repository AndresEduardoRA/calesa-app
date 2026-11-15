// El «⋯» de una cotización del listado, dicho una sola vez: qué acciones tiene, en qué orden y cuáles se ven. La fila de la tabla y la tarjeta del celular dibujan esta lista
// (`src/app/(app)/cotizaciones/menu-de-la-fila.tsx`); ninguna escribe la suya. Es la de los vehículos (`vehiculos/entities/acciones-de-vehiculo.ts`) con lo que ya existe de una
// cotización en la guardada: lo que se hace seguido arriba, lo que se marca en medio, moderar y, separado al final, lo destructivo. Cada acción llama a las **mismas** actions
// y RPC de la guardada; lo que quien mira no puede hacer no aparece (cada área dice quién: `puedeAprobar`, `puedeMarcarLaFinal`, `puedeModerarLaCotizacion`…).
import { alcanceDe, puede, type Permisos } from '@/shared/lib/permisos'
import type { ClaseDeCotizacion } from './listado'

export type ClaveDeAccionDeCotizacion =
  | 'aprobar'
  | 'final'
  | 'favorita'
  | 'reportar'
  | 'invalidar'
  | 'descartar'
  | 'reactivar'
  | 'papelera'

// El texto de cada una. Las que abren algo encima (un diálogo) llevan «…»; «Favorita» es una casilla. «Reportar…» pasa a decir que ya se reportó (el modal trae el motivo escrito).
export const ETIQUETA_DE_ACCION_DE_COTIZACION: Readonly<Record<ClaveDeAccionDeCotizacion, string>> =
  {
    aprobar: 'Aprobar',
    final: 'Marcar final…',
    favorita: 'Favorita',
    reportar: 'Reportar…',
    invalidar: 'Invalidar…',
    descartar: 'Descartar los reportes…',
    reactivar: 'Reactivar…',
    papelera: 'Enviar a la papelera',
  }

export const ETIQUETA_DE_REPORTAR_SI_YA_REPORTO = 'Reportaste esta cotización…'

// El orden, en bloques: lo que se hace seguido arriba (aprobar y marcar final), lo que se marca en medio (favorita y reportar), moderar (invalidar, descartar los reportes o
// reactivar: la base ofrece una u otras) y lo destructivo al final y separado (la papelera). Entre dos bloques con algo va un separador.
export const BLOQUES_DEL_MENU_DE_COTIZACION: readonly (readonly ClaveDeAccionDeCotizacion[])[] = [
  ['aprobar', 'final'],
  ['favorita', 'reportar'],
  ['invalidar', 'descartar', 'reactivar'],
  ['papelera'],
]

// Qué ofrece cada acción a esta persona sobre esta cotización: una clave presente es una acción que se ve (un `motivo` la deja apagada y lo dice debajo: falta el vehículo,
// es inválida…); una ausente no existe para ella. Cruza del servidor al navegador, sin los permisos.
export type OfertasDelMenuDeCotizacion = Readonly<
  Partial<Record<ClaveDeAccionDeCotizacion, { motivo: string | null }>>
>

// Lo que el menú de una fila necesita y el listado no trae: la versión con la que se actúa (el texto de la base, nunca por `Date`), las marcas de quien mira y las ofertas.
export type MenuDeUnaFila = {
  actualizadoEn: string
  favorita: boolean
  // El motivo del reporte de quien mira; nulo si no la reportó.
  miMotivo: string | null
  ofertas: OfertasDelMenuDeCotizacion
}

// Las acciones que se ofrecen, por bloques y en su orden (sin bloques vacíos).
export function accionesDeCotizacion(
  ofertas: OfertasDelMenuDeCotizacion,
): ClaveDeAccionDeCotizacion[][] {
  return BLOQUES_DEL_MENU_DE_COTIZACION.map((bloque) =>
    bloque.filter((clave) => ofertas[clave] !== undefined),
  ).filter((bloque) => bloque.length > 0)
}

// El espejo de `_cotizacion_puede_guardar()` sobre lo que el listado ya leyó: una preventa, editar por su alcance (todos, o propios si es suya: la cartera del lead no se adivina,
// la dice la base al confirmar); una final, `cotizaciones.final.gestionar` del origen. Sirve para ofrecer «Enviar a la papelera» y para el motivo de «Marcar final».
export function puedeGuardarDesdeElListado(
  cotizacion: { clase: ClaseDeCotizacion; origenId: string; creadoPor: string },
  permisos: Permisos,
  yo: string,
): boolean {
  if (cotizacion.clase === 'final') {
    return puede(permisos, 'cotizaciones.final.gestionar', cotizacion.origenId)
  }
  const alcance = alcanceDe(permisos, 'cotizaciones.editar', cotizacion.origenId)
  return alcance === 'todos' || (alcance === 'propios' && cotizacion.creadoPor === yo)
}
