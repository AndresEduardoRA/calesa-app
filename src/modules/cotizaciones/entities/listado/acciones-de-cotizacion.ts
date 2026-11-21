// Lo que sólo el «⋯» de una fila del listado necesita. La lista de acciones y su orden son del núcleo (`entities/acciones-de-cotizacion.ts`): el detalle dibuja la misma.
import { alcanceDe, puede, type Permisos } from '@/shared/lib/permisos'
import type { OfertasDelMenuDeCotizacion } from '../acciones-de-cotizacion'
import type { ClaseDeCotizacion } from './listado'

// Lo que el menú de una fila necesita y el listado no trae: la versión con la que se actúa (el texto de la base, nunca por `Date`), las marcas de quien mira y las ofertas.
export type MenuDeUnaFila = {
  actualizadoEn: string
  favorita: boolean
  // El motivo del reporte de quien mira; nulo si no la reportó.
  miMotivo: string | null
  // Una privada (glosario: «Cotización privada»): «Aprobar…» pregunta antes, porque deja de serlo.
  privada: boolean
  ofertas: OfertasDelMenuDeCotizacion
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
