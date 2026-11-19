'use client'

import type { ComponentType } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import type { LecturaEnCuadricula } from '../../../../entities/cuadricula-de-la-tarjeta'
import { referenciaUsada } from '../../../../entities/plantilla/referencia-del-lienzo'
import type { ReferenciaDeLaTarjeta } from '../../../../entities/referencia-de-la-tarjeta'
import type { PropsDelLienzoDeLaPlantilla } from '../../../../entities/vista-previa-de-la-plantilla'

type Props = {
  lectura: LecturaEnCuadricula
  referencia: ReferenciaDeLaTarjeta
  ejemplo: boolean
  Lienzo: ComponentType<PropsDelLienzoDeLaPlantilla>
}

export const AVISO_DE_PANTALLA_CHICA = 'Este editor se usa en una pantalla de al menos 1.024 px.'

// En una pantalla de menos de 1.024 px: el aviso y la tarjeta en sólo lectura (el lienzo sin capa), con la referencia elegida. El código del editor no se pide.
export function AvisoDePantallaChica({ lectura, referencia, ejemplo, Lienzo }: Props) {
  return (
    <section aria-label="Tarjeta" className="grid min-w-0 gap-3" data-tarjeta-solo-lectura="">
      <Aviso tono="info">{AVISO_DE_PANTALLA_CHICA}</Aviso>
      <Lienzo
        lectura={lectura}
        referencia={referenciaUsada(referencia, ejemplo)}
        escala="ajustar"
      />
    </section>
  )
}
