import type { Permisos } from '@/shared/lib/permisos'
import { detalleDeLaFila } from '../../../entities/alertas/fila'
import { accionDeLaFila } from '../accion-de-la-fila'
import { claveDeLaFila, type FilaDeLaBandeja } from '../../../entities/alertas/grupo-leido'
import { FilaDeLaBandeja as Fila } from './fila-de-la-bandeja'

type Props = {
  filas: readonly FilaDeLaBandeja[]
  permisos: Permisos
  ahora: Date
  // La zona horaria de la empresa: las fechas de las filas se dicen en ella.
  zona: string
  // Nombre de cada origen (por id), sólo si la persona tiene más de uno.
  origenes: ReadonlyMap<string, string> | null
}

// Las filas de un grupo (en la portada o en su página): el detalle y la acción se arman aquí, en el servidor, con los permisos de quien mira.
export function FilasDelGrupo({ filas, permisos, ahora, zona, origenes }: Props) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)]">
      {filas.map((fila) => (
        <Fila
          key={claveDeLaFila(fila)}
          fila={fila}
          detalle={detalleDeLaFila(fila, ahora, zona)}
          accion={accionDeLaFila(fila, permisos)}
          origen={origenes?.get(fila.origenId) ?? null}
        />
      ))}
    </ul>
  )
}
