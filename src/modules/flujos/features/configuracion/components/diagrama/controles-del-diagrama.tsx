'use client'

import { Panel, useReactFlow } from '@xyflow/react'
import { MaximizeIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'

type Props = { sinAnimar: () => boolean }

// Los controles del zoom, propios y en español: «Acercar», «Alejar» y «Ver todo el flujo». La rueda desplaza la página; el zoom también va con el pellizco o
// Ctrl + rueda.
export function ControlesDelDiagrama({ sinAnimar }: Props) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  return (
    <Panel position="top-right" className="flex gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="Acercar"
        title="Acercar"
        onClick={() => void zoomIn({ duration: sinAnimar() ? 0 : 200 })}
      >
        <PlusIcon aria-hidden />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Alejar"
        title="Alejar"
        onClick={() => void zoomOut({ duration: sinAnimar() ? 0 : 200 })}
      >
        <MinusIcon aria-hidden />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Ver todo el flujo"
        title="Ver todo el flujo"
        onClick={() => void fitView({ padding: 0.1, maxZoom: 1, duration: sinAnimar() ? 0 : 200 })}
      >
        <MaximizeIcon aria-hidden />
      </Button>
    </Panel>
  )
}
