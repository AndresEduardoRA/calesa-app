'use client'

import { useRef } from 'react'
import { Button } from './button'
import { ConfirmarDescarte } from './confirmar-descarte'
import { useSalidaConCambios } from './use-salida-con-cambios'

type Props = {
  hayCambios: boolean
  // El `id` del `<form>`: «Guardar» lo envía (`form=`), con o sin react-hook-form.
  formulario: string
  guardando?: boolean
  alDescartar: () => void
}

// La barra de un formulario de página (no de un `<Drawer>`, que tiene su pie): aparece al cambiar algo («Tienes cambios sin
// guardar» · «Descartar» · «Guardar») y salir de la pantalla con cambios pregunta (`useSalidaConCambios()`). Va al final de la página,
// pegada abajo (`sticky`): ocupa su propio lugar, así nunca tapa el último campo, ni con el texto al 200 % ni en el celular. Con
// `data-pie-de-panel`, los avisos suben y no la tapan. Si lo que se cambia sabe medirse solo, `useHayCambiosEnFormulario()` da `hayCambios`.
export function BarraDeCambiosSinGuardar({
  hayCambios,
  formulario,
  guardando = false,
  alDescartar,
}: Props) {
  const barra = useRef<HTMLDivElement>(null)
  const { pendiente, seguir, descartar } = useSalidaConCambios(hayCambios, alDescartar, barra)
  if (!hayCambios) {
    return null
  }
  return (
    <div
      ref={barra}
      role="region"
      aria-label="Cambios sin guardar"
      data-pie-de-panel
      className="sticky bottom-0 z-10 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-(--shadow-md)"
    >
      {pendiente ? (
        <ConfirmarDescarte alSeguir={seguir} alDescartar={descartar} />
      ) : (
        <div className="flex w-full flex-wrap gap-2 sm:items-center">
          <p className="basis-full text-(length:--text-sm) text-(--color-ink) sm:mr-auto sm:basis-auto">
            Tienes cambios sin guardar
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={guardando}
            className="min-h-[44px] max-sm:min-w-fit max-sm:flex-1 sm:min-h-9"
            onClick={alDescartar}
          >
            Descartar
          </Button>
          <Button
            type="submit"
            form={formulario}
            disabled={guardando}
            className="min-h-[44px] max-sm:min-w-fit max-sm:flex-1 sm:min-h-9"
          >
            Guardar
          </Button>
        </div>
      )}
    </div>
  )
}
