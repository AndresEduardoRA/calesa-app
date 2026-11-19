import { connection } from 'next/server'
import { ActividadRecienteAlAcercarse } from '@/modules/actividad/pantallas/actividad-reciente'
import { leerAjustes } from '@/modules/empresa'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'

// `docs/UX.md` › «Actividad»: si no se pueden leer los ajustes, la retención de fábrica.
const DIAS_POR_DEFECTO = 14

// «Actividad reciente» de la ficha: los últimos 5 cambios de este vehículo con la pieza de `actividad`, que trae su título, «Ver toda la actividad»,
// su vacío y su error, y lee desde el navegador al acercarse (las filas no pesan en el documento). La zona y los días salen de los ajustes de la
// empresa (como en `/actividad/reciente`). Sólo llega acá con `actividad.ver` (`bloquesDeQuienMira`); la base lo vuelve a mirar.
export async function BloqueActividad({ vehiculoId }: { vehiculoId: string }) {
  await connection()
  const ajustes = await leerAjustes()
  return (
    <ActividadRecienteAlAcercarse
      tabla="vehiculos"
      registroId={vehiculoId}
      zona={(ajustes.ok ? ajustes.data.ajustes.zonaHoraria : null) ?? ZONA_POR_DEFECTO}
      diasDeActividad={ajustes.ok ? ajustes.data.ajustes.actividadDias : DIAS_POR_DEFECTO}
    />
  )
}
