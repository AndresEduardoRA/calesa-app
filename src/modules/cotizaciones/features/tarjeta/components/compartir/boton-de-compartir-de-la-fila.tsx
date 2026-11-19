'use client'

import { Share2Icon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useLive } from '@/shared/ui/live'
import { useAbrirCompartirDeLaFila } from '../../hooks/use-abrir-compartir-de-la-fila'

// «Compartir» de una cotización que no es la de la página, como botón (la tarjeta «Cotización aprobada» de la ficha del vehículo): abre el diálogo de la
// fila (`?panel=compartir&para=<id>`, montado una vez por pantalla). En Modo Live no se ofrece.
export function BotonDeCompartirDeLaFila({ cotizacionId }: { cotizacionId: string }) {
  const { live } = useLive()
  const abrir = useAbrirCompartirDeLaFila()
  if (live) return null
  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11 md:min-h-9"
      onClick={() => {
        abrir(cotizacionId)
      }}
    >
      <Share2Icon aria-hidden />
      Compartir
    </Button>
  )
}
