// Las cotizaciones de la ficha del lead y de la del vehículo como tarjetas en una fila que se desliza (`docs/GLOSARIO.md` › «Fila de tarjetas»): lo que se dibuja de cada una, el
// orden y el tope. Nada de React ni de Supabase.
import { TARJETAS_EN_LA_FICHA } from '@/shared/lib/paginacion'
import type { Database } from '@/shared/types/database.types'

// Lo que dibuja una tarjeta de una ficha: lo mismo que la tarjeta de la lista, sin lo que la ficha no muestra. Lo llenan el listado (el lead) y `aprobada` (el vehículo).
export type DatosDeLaTarjeta = {
  id: string
  numero: number
  titulo: string | null
  vehiculo: string | null
  clase: Database['public']['Enums']['clase_cotizacion']
  aprobada: boolean
  totalBase: number
  modo: string | null
  autor: string
  creadoEn: string
  venceEl: string
  vencida: boolean
  cliente: string | null
  leadId: string | null
}

// Las que se dibujan: las primeras `TARJETAS_EN_LA_FICHA`, cada cotización una vez, y si había más (otra página o una de más que el tope: la aprobada fijada suma una a las diez).
export function tarjetasALaVista<F extends { id: string }>(
  filas: readonly F[],
  hayOtraPagina: boolean,
): { filas: F[]; hayMas: boolean } {
  const vistas = new Set<string>()
  const unicas = filas.filter((fila) => {
    if (vistas.has(fila.id)) {
      return false
    }
    vistas.add(fila.id)
    return true
  })
  return {
    filas: unicas.slice(0, TARJETAS_EN_LA_FICHA),
    hayMas: hayOtraPagina || unicas.length > TARJETAS_EN_LA_FICHA,
  }
}
