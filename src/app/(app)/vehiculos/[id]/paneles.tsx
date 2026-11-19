import type { FaseResumen } from '@/modules/flujos'
import type { OrigenResumen, leerLayout } from '@/modules/origenes'
import {
  SIN_APIBARA,
  type DatosDelPanelDeImagenes,
  type PermisoDeVitrina,
  type Vehiculo,
  type VistaPreviaDeVitrina,
} from '@/modules/vehiculos'
import {
  PanelDeVehiculo,
  PanelDeVitrina,
  PanelesDelMenuDeLaFicha,
} from '@/modules/vehiculos/pantallas/ficha'

type Layout = Extract<Awaited<ReturnType<typeof leerLayout>>, { ok: true }>['data']

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  fase: FaseResumen | null
  layout: Layout
  previa: VistaPreviaDeVitrina | null
  publicar: PermisoDeVitrina
  // El vehículo de `?editar=`, si es este.
  enEdicion: Vehiculo | null
  // Las fotos de «Editar imágenes», si la URL lo pide (`?panel=imagenes`).
  imagenes: DatosDelPanelDeImagenes | null
  // «Actualizar los datos», si se ofrece.
  actualizar: { puedeConfigurar: boolean } | null
}

// Los paneles laterales de la ficha, cada uno con su URL: publicar (`?panel=vitrina`), editar (`?editar=`), sus imágenes (`?panel=imagenes`) y
// actualizar los datos de la subasta (`?panel=actualizar-datos`). Desde la ficha sólo se edita: el alta vive en el inventario.
export function Paneles(props: Props) {
  const { vehiculo, origen, fase, layout, previa, publicar, enEdicion } = props
  return (
    <>
      <PanelesDelMenuDeLaFicha
        vehiculo={vehiculo}
        imagenes={props.imagenes}
        actualizar={props.actualizar}
      />
      <PanelDeVitrina
        vehiculo={vehiculo}
        origen={origen}
        fase={fase}
        campos={layout.campos}
        previa={previa}
        permiso={publicar}
      />
      <PanelDeVehiculo
        origen={origen}
        campos={layout.campos}
        categorias={layout.categorias}
        puedeCrear={false}
        enEdicion={enEdicion}
        apibara={SIN_APIBARA}
      />
    </>
  )
}
