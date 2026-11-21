import { RUTAS } from './rutas'

// El panel del Modo avanzado de la planilla de la fórmula, que ya no existe: la planilla edita como una hoja de cálculo.
export const PANEL_DEL_MODO_AVANZADO = 'editar-formula'

const PLANILLA = new RegExp(`^${RUTAS.origenes}/[^/]+/formulas/[^/]+/planilla/?$`)

// A dónde va una planilla de la fórmula abierta con `?panel=editar-formula` (un enlace guardado o el historial): a la misma planilla, sin `panel` y con el resto
// de la consulta. Nulo si la ruta no es una planilla o no abre ese panel. Lo usa el proxy para responder 308 antes del `loading.tsx`.
export function destinoSinElModoAvanzado(ruta: string, busqueda: URLSearchParams): string | null {
  if (!PLANILLA.test(ruta) || !busqueda.getAll('panel').includes(PANEL_DEL_MODO_AVANZADO)) {
    return null
  }
  const resto = new URLSearchParams(busqueda)
  resto.delete('panel')
  const consulta = resto.toString()
  return consulta === '' ? ruta : `${ruta}?${consulta}`
}
