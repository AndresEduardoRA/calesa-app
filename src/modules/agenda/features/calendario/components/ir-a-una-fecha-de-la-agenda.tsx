'use client'

import { CalendarSearchIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { IrAUnaFecha } from '@/shared/ui/ir-a-una-fecha'
import { useParametrosDeAgenda } from '../hooks/use-parametros-de-agenda'

// «Ir a una fecha» de la agenda: un botón que despliega, en línea, el selector de un día (hacia atrás o hacia adelante, sin tope). Ir escribe `?fecha=` y conserva la vista.
export function IrAUnaFechaDeLaAgenda({ zona }: { zona: string }) {
  const [, poner] = useParametrosDeAgenda()
  const [abierto, setAbierto] = useState(false)
  const id = useId()
  const contenedor = useRef<HTMLDivElement>(null)
  return (
    <>
      <Button
        variant="outline"
        aria-expanded={abierto}
        aria-controls={id}
        className="max-md:h-11 max-md:min-w-11"
        onClick={() => {
          setAbierto(!abierto)
          if (!abierto) {
            // Al desplegarse, el foco va al campo del día.
            requestAnimationFrame(() => contenedor.current?.querySelector('input')?.focus())
          }
        }}
      >
        <CalendarSearchIcon aria-hidden />
        <span className="max-md:sr-only">Ir a una fecha</span>
      </Button>
      <div id={id} ref={contenedor} hidden={!abierto} className="basis-full">
        {abierto ? (
          <IrAUnaFecha
            zona={zona}
            max={null}
            ocupado={false}
            alIr={(dia) => {
              setAbierto(false)
              void poner({ fecha: dia })
            }}
          />
        ) : null}
      </div>
    </>
  )
}
