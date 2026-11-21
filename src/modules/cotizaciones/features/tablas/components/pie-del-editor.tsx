'use client'

import { useEnLaEdicion } from '@/shared/ui/edicion-a-pantalla-completa'
import { BarraDeCambios } from './barra-de-cambios'
import { PublicarTabla } from './publicar-tabla'

type Props = Parameters<typeof PublicarTabla>[0] & { alDescartar: () => void }

// Lo de abajo del editor: la barra de cambios con «Publicar» y «Descartar los cambios». En la edición a pantalla completa no hay barra abajo: «Publicar» sube a la
// barra de arriba (`PublicarTabla` se encarga) y «Descartar los cambios» va en su «⋯».
export function PieDelEditor({ alDescartar, ...publicar }: Props) {
  const enLaEdicion = useEnLaEdicion()
  if (enLaEdicion) {
    return <PublicarTabla {...publicar} />
  }
  return (
    <BarraDeCambios cambios={publicar.edicion.cambios} alDescartar={alDescartar}>
      <PublicarTabla {...publicar} />
    </BarraDeCambios>
  )
}
