'use client'

import { Drawer } from '@/shared/ui/drawer'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { ContenidoDeImagenes } from './contenido-de-imagenes'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Cada apertura empieza de cero (se lee de nuevo).
  apertura: number
  // El ítem que se muestra (el último que se vio, mientras el panel se va).
  item: FilaDeItem | null
  // `puedeEditar` (repuestos.editar) y no cerrado: sin eso el panel es de lectura (D70).
  editable: boolean
  cerrado: boolean
  focoAlCerrar: () => HTMLElement | boolean
}

// El panel de imágenes de un ítem (`?panel=imagenes&item=<id>`, 8.09-3, C11 y C12): contador exacto («3 de 8»: el tope es duro), la zona para subir, la galería con «Quitar» y «Deshacer».
// Se queda montado cerrado y cada apertura remonta el contenido con su `key`. No guarda nada tipeado: sube y quita al instante.
export function DrawerDeImagenes({ apertura, item, editable, cerrado, ...resto }: Props) {
  return (
    <Drawer
      abierto={resto.abierto}
      alCerrar={resto.alCerrar}
      titulo={item ? `Imágenes de «${item.descripcion}»` : 'Imágenes del ítem'}
      descripcion="Hasta 8 imágenes por ítem."
      ancho="amplio"
      focoAlCerrar={resto.focoAlCerrar}
    >
      {item ? (
        <ContenidoDeImagenes key={apertura} item={item} editable={editable} cerrado={cerrado} />
      ) : null}
    </Drawer>
  )
}
