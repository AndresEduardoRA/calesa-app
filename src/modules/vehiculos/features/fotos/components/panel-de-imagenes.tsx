'use client'

import { Drawer } from '@/shared/ui/drawer'
import { EstadoVacio } from '@/shared/ui/estados'
import type { DatosDelPanelDeImagenes } from '../../../entities/paneles-de-la-lista'
import { useLoUltimoAbierto } from '../../acciones/hooks/use-lo-ultimo-abierto'
import { EsqueletoDeFotos } from './esqueleto-de-fotos'
import { SeccionDeFotos } from './seccion-de-fotos'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El vehículo que pide la URL (`para` en el inventario, el de la ficha); null si falta.
  esperado: string | null
  // Lo que leyó el servidor al abrirse; null o de otro vehículo mientras llega.
  datos: DatosDelPanelDeImagenes | null
}

// El drawer «Editar imágenes» del «⋯» del vehículo (`?panel=imagenes&para=<id>` en el inventario, `?panel=imagenes` en la ficha): lo mismo que el
// bloque «Fotos» de la ficha (subir, ordenar, portada, quitar con «Deshacer» y traer las que faltan de la subasta). Cada cambio vuelve a dibujar la
// pantalla (las actions revalidan): al cerrar, la lista o la ficha ya tienen la portada nueva.
export function PanelDeImagenes(props: Props) {
  const { abierto, alCerrar } = props
  const esperado = useLoUltimoAbierto(props.esperado, abierto)
  const datos = useLoUltimoAbierto(props.datos, abierto)
  const listo = datos !== null && datos.id === esperado
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Editar imágenes"
      descripcion={listo && datos.disponible ? datos.titulo : undefined}
    >
      {esperado === null || (listo && !datos.disponible) ? (
        <EstadoVacio
          titulo="No existe o no tienes acceso"
          descripcion="Puede que se haya eliminado, o que esté en un origen que no ves."
        />
      ) : listo && datos.disponible ? (
        <SeccionDeFotos
          vehiculoId={datos.id}
          galeria={datos.galeria}
          puedeEditar={datos.puedeEditar}
          {...(datos.deSubasta ? { deSubasta: datos.deSubasta } : {})}
        />
      ) : (
        <EsqueletoDeFotos />
      )}
    </Drawer>
  )
}
