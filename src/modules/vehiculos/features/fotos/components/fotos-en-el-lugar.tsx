'use client'

import { CarIcon } from 'lucide-react'
import { cn } from 'cn'
import { urlPublica } from '@/shared/lib/almacen'
import { CarruselEnElLugar } from '@/shared/ui/visor-de-imagenes'
import { useCargarFotos } from '../hooks/use-cargar-fotos'

type Props = {
  // La fila: su id, su título y la miniatura de la portada (ruta en el bucket `vehiculos`).
  vehiculo: { id: string; titulo: string; portadaRuta: string | null }
  // `abrir` en la fila de la tabla (no caben flechas de 44 px en 56 px); `carrusel` en la tarjeta y las cabeceras.
  modo?: 'carrusel' | 'abrir'
  // Qué visor abre `?visor=`: por defecto el id del vehículo. El mismo vehículo en dos lugares de una pantalla (dos grupos de «Relacionados») lleva una clave por lugar, o se abrirían dos.
  clave?: string
  // Los puntos del carrusel a la derecha: en la tarjeta de la lista, donde el chip del lote va abajo a la izquierda.
  puntos?: 'centro' | 'derecha'
  className?: string
}

// Las fotos de un vehículo donde se nombra (fila, tarjeta, ficha, hoja de cotizar): la portada y, al acercarse, el resto por
// `leerFotosEnElLugar` (a lo sumo 24, una sola lectura). Siempre del mismo tamaño (4:3): con o sin foto, la lista no salta.
export function FotosEnElLugar({ vehiculo, modo = 'carrusel', clave, puntos, className }: Props) {
  const { id: vehiculoId, titulo, portadaRuta: portada } = vehiculo
  const cargar = useCargarFotos(vehiculoId)
  return (
    // Una portada nueva (otra foto elegida como portada) vuelve a montar el carrusel: lo que ya había leído viene en el orden viejo.
    <CarruselEnElLugar
      key={portada ?? ''}
      clave={clave ?? vehiculoId}
      titulo={titulo}
      portada={portada ? urlPublica('vehiculos', portada) : null}
      cargar={cargar}
      modo={modo}
      puntos={puntos}
      vacio={<CarIcon className="size-5 text-(--color-ink-faint)" />}
      className={cn('aspect-4/3 rounded-(--radius-sm) bg-(--color-paper-dim)', className)}
    />
  )
}
