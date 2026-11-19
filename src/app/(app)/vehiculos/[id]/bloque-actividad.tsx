import { connection } from 'next/server'
import { ActividadReciente } from '@/modules/actividad/pantallas/actividad-reciente'
import { leerAjustes } from '@/modules/empresa'
import type { Permisos } from '@/modules/equipo'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'

// `docs/UX.md` › «Actividad»: si no se pueden leer los ajustes, la retención de fábrica.
const DIAS_POR_DEFECTO = 14

// «Actividad reciente» de la ficha: los últimos 5 cambios de este vehículo con la pieza de `actividad`, que trae su título, «Ver toda la actividad»,
// su vacío y su error. La zona y los días salen de los ajustes de la empresa (como en `/actividad/reciente`). Sin `actividad.ver` no llega acá
// (`bloquesDeQuienMira`) y la pieza tampoco dibuja nada.
export async function BloqueActividad({
  vehiculoId,
  permisos,
}: {
  vehiculoId: string
  permisos: Permisos
}) {
  await connection()
  const ajustes = await leerAjustes()
  return (
    <ActividadReciente
      tabla="vehiculos"
      registroId={vehiculoId}
      permisos={permisos}
      zona={(ajustes.ok ? ajustes.data.ajustes.zonaHoraria : null) ?? ZONA_POR_DEFECTO}
      diasDeActividad={ajustes.ok ? ajustes.data.ajustes.actividadDias : DIAS_POR_DEFECTO}
    />
  )
}
