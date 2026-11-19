'use client'

import { LayoutTemplateIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { PropsDelLienzoDeLaPlantilla } from '../../../../entities/vista-previa-de-la-plantilla'
import { ModalDePlantillasDeV1Diferido } from './diferidos'

export const PANEL_DE_PLANTILLAS_DE_V1 = 'plantillas-de-v1'

type Props = {
  origen: { id: string; nombre: string }
  // El lienzo de la pestaña Tarjeta (área `tarjeta`), que la página pasa por este hueco: el modal dibuja con él la tarjeta de cada plantilla con cifras de ejemplo.
  Lienzo: ComponentType<PropsDelLienzoDeLaPlantilla>
}

// «Empezar desde una plantilla», la acción del origen junto a sus chips (secundaria: cada pestaña ya tiene su primaria). Abre `?panel=plantillas-de-v1`, que vale en las
// cuatro pestañas; cada apertura empieza de cero (lee otra vez las plantillas y los borradores). docs/UX.md › «Cotización: empezar desde una plantilla».
export function EmpezarDesdeUnaPlantilla({ origen, Lienzo }: Props) {
  const panel = usePanelPorUrl(PANEL_DE_PLANTILLAS_DE_V1)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  const apertura = useApertura(panel.abierto)
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full sm:w-auto md:min-h-8"
        onClick={() => panel.abrir()}
      >
        <LayoutTemplateIcon aria-hidden />
        Empezar desde una plantilla
      </Button>
      {montar ? (
        <ModalDePlantillasDeV1Diferido
          key={apertura}
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          origen={origen}
          Lienzo={Lienzo}
        />
      ) : null}
    </>
  )
}
