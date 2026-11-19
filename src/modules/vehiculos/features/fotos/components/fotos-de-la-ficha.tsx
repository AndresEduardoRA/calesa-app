'use client'

import { CarFrontIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { urlPublica } from '@/shared/lib/almacen'
import { CarruselConTira } from '@/shared/ui/visor-de-imagenes'
import { useCargarFotos } from '../hooks/use-cargar-fotos'

type Props = {
  vehiculo: { id: string; titulo: string; portadaRuta: string | null }
  // El «⋯» y la vitrina, en la esquina de la foto (ya posicionados).
  sobreLaFoto?: ReactNode
}

// Las fotos en la cabecera de la ficha: el carrusel con la tira de miniaturas debajo (se leen al llegar, una sola vez). El visor es el de siempre, por
// el id del vehículo (`?visor=<id>&foto=n`): los enlaces viejos lo siguen abriendo. El alto se acota en el celular (una columna) para que la foto no
// ocupe la pantalla entera; en la lateral de escritorio manda el ancho.
export function FotosDeLaFicha({ vehiculo, sobreLaFoto }: Props) {
  const cargar = useCargarFotos(vehiculo.id)
  return (
    <CarruselConTira
      clave={vehiculo.id}
      titulo={vehiculo.titulo}
      portada={vehiculo.portadaRuta ? urlPublica('vehiculos', vehiculo.portadaRuta) : null}
      cargar={cargar}
      vacio={<CarFrontIcon className="size-5 text-(--color-ink-faint)" />}
      className="aspect-4/3 max-h-[45svh] rounded-(--radius-sm) bg-(--color-paper-dim)"
      sobreLaFoto={sobreLaFoto}
    />
  )
}
