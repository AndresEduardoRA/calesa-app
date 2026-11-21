'use client'

import { RotateCwIcon } from 'lucide-react'
import { Button } from './button'

// Recarga completa del navegador (F5), no un `router.refresh()`. Con cambios sin guardar no hace nada especial: el `beforeunload` de `useSalidaConCambios()` ya
// hace que el navegador pregunte, como con F5.
const recargar = () => {
  window.location.reload()
}

// «Recargar la página» de la barra superior, a la izquierda del buscador. Desde 28 rem de barra (un celular angosto no tiene lugar: sumarlo desbordaba la barra o
// dejaba el buscador en 22 px) va en un ícono; debajo de eso queda en el menú (`<RecargarEnElMenu>`). La barra es el `@container` (`marco.tsx`).
export function RecargarLaPagina() {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      className="hidden size-[44px] shrink-0 md:size-9 @min-[28rem]:inline-flex"
      aria-label="Recargar la página"
      title="Recargar la página"
      onClick={recargar}
    >
      <RotateCwIcon aria-hidden />
    </Button>
  )
}

// Lo mismo, con su nombre a la vista, al pie del menú del celular.
export function RecargarEnElMenu() {
  return (
    <Button
      variant="ghost"
      className="mt-4 h-[44px] w-full justify-start gap-2 px-2"
      onClick={recargar}
    >
      <RotateCwIcon aria-hidden />
      Recargar la página
    </Button>
  )
}
