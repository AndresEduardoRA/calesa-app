'use client'

import type { RefObject } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { useRegional } from '@/shared/ui/regional'
import { useRevisiones } from '../hooks/use-revisiones'
import { ContenidoDeRevisiones } from './contenido-de-revisiones'

type Props = {
  abierto: boolean
  alCerrar: () => void
  cotizacionId: string
  numero: number
  // La versión de la cotización (`actualizadoEn`): con otra, lo leído era de la anterior y se vuelve a leer.
  version: string
  // El botón «Revisiones»: el foco vuelve a él al cerrar, también si el panel se abrió por la URL.
  botonDeRevisiones: RefObject<HTMLButtonElement | null>
}

// Las revisiones de una cotización guardada (4.15-3b): un panel de sólo lectura con su URL (`?panel=revisiones`). Se monta la primera vez que se abre (`useAbiertoAlgunaVez`) y
// desde ahí conserva lo leído: cerrarlo y abrirlo no vuelve a pedir lo mismo.
export function PanelDeRevisiones({
  abierto,
  alCerrar,
  cotizacionId,
  numero,
  version,
  botonDeRevisiones,
}: Props) {
  const revisiones = useRevisiones({ cotizacionId, version, abierto })
  const { zonaHoraria } = useRegional()
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Revisiones de la cotización n.º ${String(numero)}`}
      focoAlCerrar={() => botonDeRevisiones.current ?? true}
    >
      <ContenidoDeRevisiones revisiones={revisiones} zona={zonaHoraria} />
    </Drawer>
  )
}
