'use client'

import type { ReactNode } from 'react'
import { EsquinaDeAcciones } from '@/shared/ui/lista'
import type { Vehiculo } from '../../../entities/vehiculo'
import { FotosEnElLugar } from '../../fotos/components/fotos-en-el-lugar'
import { ChipDelLote } from './chip-del-lote'

type Props = {
  vehiculo: Pick<Vehiculo, 'id' | 'titulo' | 'portadaRuta' | 'lote'>
  // La casilla para elegirlo: arriba a la izquierda, espejo del «⋯».
  seleccion?: ReactNode
  // El «⋯» del vehículo: arriba a la derecha.
  acciones?: ReactNode
}

// La foto de la tarjeta de la lista, a todo el ancho (4:3, con su carrusel): la casilla arriba a la izquierda, el «⋯» arriba a la derecha y el chip del lote
// abajo a la izquierda (los puntos del carrusel, a la derecha: nunca se tocan). Sin foto, todo en el mismo lugar sobre el marcador.
export function FotoDeLaTarjeta({ vehiculo, seleccion, acciones }: Props) {
  return (
    <div className="relative w-full">
      <FotosEnElLugar vehiculo={vehiculo} modo="carrusel" puntos="derecha" className="w-full" />
      <ChipDelLote lote={vehiculo.lote} />
      {seleccion ? (
        <EsquinaDeAcciones sobreImagen lado="izquierda">
          {seleccion}
        </EsquinaDeAcciones>
      ) : null}
      {acciones ? <EsquinaDeAcciones sobreImagen>{acciones}</EsquinaDeAcciones> : null}
    </div>
  )
}
