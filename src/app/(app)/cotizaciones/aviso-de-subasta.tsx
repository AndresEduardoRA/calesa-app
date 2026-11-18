import { connection } from 'next/server'
import { integracionActiva } from '@/modules/empresa'
import { CLAVE_DE_GANADA, VALOR_DE_GANADA } from '@/modules/logistica'
import { avisoDeSubastaCerrada, type Vehiculo } from '@/modules/vehiculos'
import { AvisoDeSubastaCerrada } from '@/modules/vehiculos/pantallas/cotizar'
import type { Permisos } from '@/shared/lib/permisos'
import { unidadDeLogistica } from '@/shared/lib/rutas'

type Props = {
  // El vehículo de la hoja, con si quien mira lo puede editar (`editablesDe`); null si la hoja no tiene vehículo.
  elegido: { vehiculo: Vehiculo; editable: boolean } | null
  origen: { id: string; nombre: string; tipo: string }
  permisos: Permisos
}

// El aviso de la hoja cuando la subasta del vehículo elegido ya cerró (`docs/UX.md` › «Cotizar»): lo lee el servidor con cada vehículo que se elige y se
// dibuja sólo si hay algo que decir. «La ganamos» lleva al mover de logística en su modo: `vehiculos` no conoce `logistica`, el enlace lo arma esta
// página. Sólo pregunta por apibara cuando el vehículo es candidato (de subasta y fuera de su fase).
export async function AvisoDeSubastaDeLaHoja({ elegido, origen, permisos }: Props) {
  if (elegido === null || origen.tipo !== 'subasta' || elegido.vehiculo.situacion === 'fase') {
    return null
  }
  const { vehiculo, editable } = elegido
  await connection()
  const datos = await avisoDeSubastaCerrada({
    vehiculo,
    origen,
    permisos,
    editable,
    apibaraActiva: await integracionActiva('apibara'),
    ahora: new Date(),
  })
  if (datos === null) {
    return null
  }
  return (
    <AvisoDeSubastaCerrada
      key={vehiculo.id}
      datos={datos}
      hrefLaGanamos={`${unidadDeLogistica(vehiculo.id)}?${CLAVE_DE_GANADA}=${VALOR_DE_GANADA}`}
    />
  )
}
