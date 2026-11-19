'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/shared/ui/button'

type Props = { enCurso: boolean; alSeguir: () => void; alVolver: () => void }

// «Volver a la plantilla» pregunta en el pie del mismo modal (el diálogo `Confirmar` sería un modal sobre otro), como `ConfirmarDescarte`: «Seguir retocando» nace
// con el foco, así un Enter de más no borra nada. Confirmar guarda en el acto.
export function ConfirmarVolverALaPlantilla({ enCurso, alSeguir, alVolver }: Props) {
  const seguir = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const cuadro = requestAnimationFrame(() => {
      seguir.current?.focus()
    })
    return () => {
      cancelAnimationFrame(cuadro)
    }
  }, [])
  return (
    <div className="flex w-full flex-wrap gap-2 sm:items-center">
      <p role="alert" className="basis-full text-sm sm:mr-auto sm:basis-auto">
        ¿Volver a la plantilla? Se quitan los retoques de esta cotización.
      </p>
      <Button
        variant="destructive"
        disabled={enCurso}
        className="order-last max-sm:min-w-fit max-sm:flex-1 sm:order-none"
        onClick={alVolver}
      >
        Volver a la plantilla
      </Button>
      <Button
        ref={seguir}
        autoFocus
        disabled={enCurso}
        className="max-sm:min-w-fit max-sm:flex-1"
        onClick={alSeguir}
      >
        Seguir retocando
      </Button>
    </div>
  )
}
