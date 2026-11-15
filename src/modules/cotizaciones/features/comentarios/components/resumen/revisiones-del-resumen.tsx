'use client'

import { useRegional } from '@/shared/ui/regional'
import { ContenidoDeRevisiones } from '../../../revisiones/components/contenido-de-revisiones'
import { useRevisiones } from '../../../revisiones/hooks/use-revisiones'

// «Revisiones» del resumen: las mismas del panel de la guardada (de a `TAMANO_DE_VER_MAS` por cursor, «Ir a una fecha», el tope), leídas al abrir la pestaña. Lo leído es de la
// cotización abierta: con otra, el resumen monta la pestaña de nuevo. Sólo lectura, como allá.
export function RevisionesDelResumen({ cotizacionId }: { cotizacionId: string }) {
  const { zonaHoraria } = useRegional()
  // La «versión» es la cotización: el resumen no sabe cuándo se guardó por última vez, y al reabrirlo la pestaña vuelve a leer.
  const revisiones = useRevisiones({ cotizacionId, version: cotizacionId, abierto: true })
  return <ContenidoDeRevisiones revisiones={revisiones} zona={zonaHoraria} />
}
