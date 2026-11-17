'use client'

import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import type { Seguimiento } from '../../../entities/seguimiento'
import { useLecturaDeTodos, type DatosDeTodos } from '../hooks/use-lectura-de-todos'
import { useSeguimientos } from '../hooks/use-seguimientos'
import { EsqueletoDeSeguimientos } from './esqueleto-de-seguimientos'
import { LineaDeSeguimientos } from './linea-de-seguimientos'

type Props = {
  leadId: string
  // Algo se anotó, editó o eliminó: al cerrarse el drawer, la ficha se vuelve a leer.
  alCambiar: () => void
}

function Contenido({ leadId, datos, alCambiar }: Props & { datos: DatosDeTodos }) {
  const { zonaHoraria } = useRegional()
  const leidos = useSeguimientos(leadId, datos.pagina)
  const seguimientos = {
    ...leidos,
    poner: (uno: Seguimiento) => {
      leidos.poner(uno)
      alCambiar()
    },
  }
  return (
    <LineaDeSeguimientos
      leadId={leadId}
      tipos={datos.tipos}
      zona={zonaHoraria}
      seguimientos={seguimientos}
      enDrawer
    />
  )
}

// «Ver todos los seguimientos» (`?todos=seguimientos`): la línea de tiempo completa (anotar, editar y eliminar lo propio, «Ver más» hasta
// el tope, «Ir a una fecha»), leída desde el navegador al abrirse. Los modales se dibujan dentro del drawer: Base UI los anida (Esc cierra
// sólo el de arriba).
export function TodosLosSeguimientos({ leadId, alCambiar }: Props) {
  const { lectura, reintentar } = useLecturaDeTodos(leadId)
  if (lectura === null) {
    return <EsqueletoDeSeguimientos forma="linea" />
  }
  if (lectura.estado === 'error') {
    return (
      <div role="alert" className="grid gap-3">
        <p className="text-(length:--text-sm) text-(--color-ink)">
          No se pudieron cargar los seguimientos.
        </p>
        <Button type="button" variant="outline" onClick={reintentar} className="w-fit">
          Reintentar
        </Button>
      </div>
    )
  }
  return <Contenido key={leadId} leadId={leadId} datos={lectura.datos} alCambiar={alCambiar} />
}
