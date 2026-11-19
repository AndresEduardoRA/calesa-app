'use client'

import { LogOutIcon, SendIcon, UserPlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { ETIQUETA_DE_SALIR, type AccionesDeCartera } from '../../../entities/cartera'
import { usePanelDeLead } from '../../ficha/hooks/use-panel-de-lead'

type Props = {
  acciones: AccionesDeCartera
  enCurso: boolean
  alSalir: () => void
}

// Dos columnas iguales si caben las dos (8 rem cada una); con una sola, o en la columna angosta con el texto al 200 %, una a todo el ancho.
const REJILLA = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2'

// Los botones de «Quién lo tiene»: «Compartir» y «Transferir» se reparten todo el ancho de la columna, sin huecos (mitad y mitad; uno solo,
// todo el ancho); «Salir de este lead», en su propia fila y también a lo ancho.
export function BotonesDeCartera({ acciones, enCurso, alSalir }: Props) {
  const panel = usePanelDeLead()
  return (
    <div className="grid gap-2">
      {acciones.compartir || acciones.transferir ? (
        <div className={REJILLA}>
          {acciones.compartir ? (
            <Button
              variant="outline"
              className="h-11 w-full md:h-9"
              onClick={panel.compartir.abrir}
              disabled={enCurso}
            >
              <UserPlusIcon aria-hidden />
              Compartir
            </Button>
          ) : null}
          {acciones.transferir ? (
            <Button
              variant="outline"
              className="h-11 w-full md:h-9"
              onClick={panel.transferir.abrir}
              disabled={enCurso}
            >
              <SendIcon aria-hidden />
              Transferir
            </Button>
          ) : null}
        </div>
      ) : null}
      {acciones.salir ? (
        <Button variant="ghost" className="h-11 w-full md:h-9" onClick={alSalir} disabled={enCurso}>
          <LogOutIcon aria-hidden />
          {ETIQUETA_DE_SALIR}
        </Button>
      ) : null}
    </div>
  )
}
