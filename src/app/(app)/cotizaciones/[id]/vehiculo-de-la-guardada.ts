import { cambioDeVehiculo, type CambioPermitido } from '@/modules/cotizaciones'
import { getOrigenes, type OrigenResumen } from '@/modules/origenes'
import type { AltaDelPanel } from '@/modules/vehiculos/pantallas/cotizar'
import {
  altaDelPanelDe,
  elegidoDeLaUrl,
  type Quien,
  type VehiculoDeLaUrl,
} from '../vehiculo-de-la-hoja'

type Guardada = {
  cotizacion: { origenId: string; clase: 'preventa' | 'final' }
  puedeGuardar: boolean
}

export type LoDelVehiculo = {
  // Qué permite la barra (`cambioDeVehiculo()`): con `elige`, el panel de cotizar sin «Quitar».
  cambio: CambioPermitido
  // El vehículo elegido para cambiarlo (`?vehiculo=`), con el que calculó la hoja, si quien mira lo ve; nulo si no hay.
  nuevo: VehiculoDeLaUrl
  // El origen de la cotización (sólo con `elige`): su tipo dice si el panel tiene «Cierre subasta»; nulo si está inactivo.
  origen: OrigenResumen | null
  // Para dar de alta desde el panel («+», «Traer»), como en cotizar.
  alta: AltaDelPanel | null
  // El vehículo pedido no se pudo usar (la base lo rechazó al calcular): la barra lo dice con «Elegir otro vehículo» y la hoja calculó con el suyo.
  rechazado: boolean
}

const SIN_ELEGIR = { nuevo: null, origen: null, alta: null, rechazado: false } as const

// Lo del vehículo de una guardada (T315), en paralelo con lo demás de la página. Sólo quien puede cambiarlo (una preventa que guarda) paga estas lecturas: el origen (una por
// pedido, `cache()`), el alta del panel y, con un vehículo nuevo, ese vehículo. El aviso de subasta cerrada lo lee la cabecera, sólo para el nuevo (no para el guardado).
export async function leerLoDelVehiculo(
  sesion: Quien,
  hoja: Guardada,
  de: { vehiculoNuevo: string | null; vehiculoSoltado: boolean },
): Promise<LoDelVehiculo> {
  const cambio = cambioDeVehiculo({
    clase: hoja.cotizacion.clase,
    puedeGuardar: hoja.puedeGuardar,
  })
  if (cambio !== 'elige') {
    return { cambio, ...SIN_ELEGIR }
  }
  const [origenes, nuevo] = await Promise.all([
    getOrigenes(),
    elegidoDeLaUrl(sesion, de.vehiculoNuevo),
  ])
  const origen = origenes.ok
    ? (origenes.data.find((uno) => uno.id === hoja.cotizacion.origenId) ?? null)
    : null
  const alta = origen === null ? null : await altaDelPanelDe(sesion.permisos, origen)
  return { cambio, nuevo, origen, alta, rechazado: de.vehiculoSoltado }
}
