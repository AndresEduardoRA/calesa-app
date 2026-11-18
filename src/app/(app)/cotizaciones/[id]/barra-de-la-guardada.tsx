'use client'

import { tituloDeLaCotizacion, useTituloDeLaCotizacion } from '@/modules/cotizaciones/client'
import { CampoDelTituloDiferido } from '@/modules/cotizaciones/pantallas/cotizacion'
import type { VehiculoElegido } from '@/modules/vehiculos'
import { BarraDelVehiculo } from '@/modules/vehiculos/pantallas/cotizar'

type Props = {
  origenId: string
  esSubasta: boolean
  // La clave del vehículo en la URL de la hoja (`CLAVE_DE_VEHICULO`, del servidor): el panel no elige acá, pero la barra la pide.
  claveDeLaUrl: string
  numero: number
  // El vehículo si quien mira lo ve; nulo si no tiene o no se ve.
  elegido: VehiculoElegido | null
  // Si la cotización tiene vehículo (aunque quien mira no lo vea): sin él, la barra dice «Sin vehículo».
  conVehiculo: boolean
  puedeVer: boolean
  // `puede_guardar` de la base: el panel abre con el campo del título; sin él, la barra sólo muestra.
  puedeGuardar: boolean
}

// La barra del vehículo en la cabecera de una guardada (T307): el título grande (el que se escribe, si quien mira la puede guardar) y el vehículo debajo, en sólo lectura
// (cambiarlo no es de esta pantalla). Quien la puede guardar abre el panel con el campo del título arriba; quien sólo la ve, no tiene panel. `vehiculos` no conoce
// `cotizaciones`: el título y el campo los pone esta página.
export function BarraDeLaGuardada({
  origenId,
  esSubasta,
  claveDeLaUrl,
  numero,
  elegido,
  conVehiculo,
  puedeVer,
  puedeGuardar,
}: Props) {
  const titulo = useTituloDeLaCotizacion()
  // Sin título ni vehículo (una vieja que nadie guardó), «Cotización n.º N».
  const mostrado =
    titulo?.mostrado ??
    tituloDeLaCotizacion({ titulo: null, vehiculo: null, numero })?.texto ??
    null
  return (
    <BarraDelVehiculo
      origenId={origenId}
      esSubasta={esSubasta}
      elegido={elegido}
      alta={null}
      puedeVer={puedeVer}
      claveDeLaUrl={claveDeLaUrl}
      cotizado={null}
      historial={null}
      titulo={mostrado}
      textoSinVehiculo={conVehiculo ? null : 'Sin vehículo'}
      modo={puedeGuardar ? 'ver_elegido' : 'solo_mostrar'}
      arribaDelPanel={puedeGuardar ? <CampoDelTituloDiferido /> : null}
    />
  )
}
