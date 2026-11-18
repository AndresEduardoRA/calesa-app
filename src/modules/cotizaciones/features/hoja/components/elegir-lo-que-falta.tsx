'use client'

import { Button } from '@/shared/ui/button'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { EleccionDeLoQueFalta, LoQueFalta } from '../../../entities/obligatorios-al-cotizar'
import { useTituloDeLaCotizacion } from '../hooks/use-titulo-de-la-cotizacion'

const TEXTO_DEL_BOTON: Readonly<Record<LoQueFalta, string>> = {
  lead: 'Elegir el cliente',
  vehiculo: 'Elegir el vehículo',
  titulo: 'Escribir el título',
}

function BotonDeElegir({ panel, que }: { panel: string; que: LoQueFalta }) {
  const abrir = usePanelPorUrl(panel).abrir
  // El título se escribe en el panel del vehículo: el campo toma el foco al abrirse (no por la URL: el buscador del panel no se lo quita).
  const pedirFoco = useTituloDeLaCotizacion()?.pedirFoco
  return (
    <Button
      variant="outline"
      className="min-h-11 justify-self-start md:min-h-8"
      // Como «Guardar»: el foco no sale de una celda abierta (un clic afuera descartaría lo que no es un número).
      onMouseDown={(evento) => {
        evento.preventDefault()
      }}
      onClick={() => {
        if (que === 'titulo') {
          pedirFoco?.()
        }
        abrir()
      }}
    >
      {TEXTO_DEL_BOTON[que]}
    </Button>
  )
}

// La salida de «Para guardar, elige el cliente…»: el botón que abre el panel de lo que falta (`?panel=cliente` o `?panel=vehiculo`, también para «Escribir el título»; los
// nombres los pasa `src/app`), o, sin permiso para ver leads o vehículos de ese origen, a quién pedirlo (`docs/UX.md` › «Cotizar»).
export function ElegirLoQueFalta({
  que,
  eleccion,
}: {
  que: LoQueFalta
  eleccion: EleccionDeLoQueFalta
}) {
  if ('pedido' in eleccion) {
    return <p className="text-(length:--text-sm) text-(--color-ink-soft)">{eleccion.pedido}</p>
  }
  return <BotonDeElegir panel={eleccion.panel} que={que} />
}
