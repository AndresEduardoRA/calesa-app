'use client'

import { tituloDeLaCotizacion, useTituloDeLaCotizacion } from '@/modules/cotizaciones/client'
import { CampoDelTituloDiferido } from '@/modules/cotizaciones/pantallas/cotizacion'
import type { VehiculoElegido } from '@/modules/vehiculos'
import {
  BarraDelVehiculo,
  type AltaDelPanel,
  type ModoDeLaBarra,
} from '@/modules/vehiculos/pantallas/cotizar'

type Props = {
  origenId: string
  // «Cierre subasta» en las listas del panel: el tipo del origen (sólo cuenta si se elige).
  esSubasta: boolean
  // La clave del vehículo en la URL de la hoja (`CLAVE_DE_VEHICULO`, del servidor): elegir otro la escribe.
  claveDeLaUrl: string
  numero: number
  // El vehículo de la hoja (el elegido para cambiarlo o el guardado) si quien mira lo ve; nulo si no tiene o no se ve.
  elegido: VehiculoElegido | null
  // Si la hoja tiene vehículo (aunque quien mira no lo vea): sin él, la barra dice «Sin vehículo».
  conVehiculo: boolean
  puedeVer: boolean
  // `puede_guardar` de la base: el panel abre con el campo del título; sin él, la barra sólo muestra.
  puedeGuardar: boolean
  // Qué deja hacer la barra (`cambioDeVehiculo()`, traducido por la página): `cambiar` en una preventa, `ver_elegido` en una final, `solo_mostrar` para quien sólo ve.
  modo: ModoDeLaBarra
  // En una final: «Una cotización final no cambia de vehículo.».
  motivoSinCambiar: string | null
  // El vehículo pedido no se pudo usar: «No se puede usar ese vehículo.», con «Elegir otro vehículo».
  avisoDelElegido: string | null
  // Para dar de alta desde el panel, como en cotizar; nulo = sólo busca y elige.
  alta: AltaDelPanel | null
}

// La barra del vehículo en la cabecera de una guardada (T307): el título grande (el que se escribe, si quien mira la puede guardar) y el vehículo debajo. En una preventa que
// quien mira puede guardar, el panel es el de cotizar sin «Quitar» (T315: elegir otro escribe `?vehiculo=` y la hoja recalcula con él); en una final, el vehículo en sólo
// lectura con el motivo; quien sólo la ve no tiene panel. El dato del vehículo de una tabla no se elige acá (falta un lector de opciones por cotización: `docs/PENDIENTES.md`).
// `vehiculos` no conoce `cotizaciones`: el título y el campo los pone esta página.
export function BarraDeLaGuardada({
  origenId,
  esSubasta,
  claveDeLaUrl,
  numero,
  elegido,
  conVehiculo,
  puedeVer,
  puedeGuardar,
  modo,
  motivoSinCambiar,
  avisoDelElegido,
  alta,
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
      alta={alta}
      puedeVer={puedeVer}
      claveDeLaUrl={claveDeLaUrl}
      cotizado={null}
      historial={null}
      titulo={mostrado}
      textoSinVehiculo={conVehiculo ? null : 'Sin vehículo'}
      modo={modo}
      motivoSinCambiar={motivoSinCambiar}
      avisoDelElegido={avisoDelElegido}
      arribaDelPanel={puedeGuardar ? <CampoDelTituloDiferido /> : null}
    />
  )
}
