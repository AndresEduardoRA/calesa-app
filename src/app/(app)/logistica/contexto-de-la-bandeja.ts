import { getAjustes } from '@/modules/empresa'
import { leerOrigenesDeLaCadena } from '@/modules/logistica'
import type { Permisos } from '@/shared/lib/permisos'

// Lo que las filas de la bandeja del día necesitan de la empresa: la zona horaria para decir las fechas y, si la persona ve la logística de más de un origen, el nombre de cada uno (para saber de
// cuál es una fila). Si no se pueden leer los orígenes, las filas salen sin el nombre: no tumba la bandeja.
export async function contextoDeLaBandeja(permisos: Permisos): Promise<{
  zona: string
  origenes: ReadonlyMap<string, string> | null
}> {
  const [ajustes, lista] = await Promise.all([getAjustes(), leerOrigenesDeLaCadena(permisos)])
  const origenes = lista?.origenes ?? []
  return {
    zona: ajustes.zonaHoraria,
    origenes: origenes.length > 1 ? new Map(origenes.map((o) => [o.id, o.nombre])) : null,
  }
}
