import { EsqueletoDeLaUnidad } from '@/modules/logistica/pantallas/unidad-esqueletos'
import { CLASE_DEL_ALTO_DEL_DETALLE } from './alto-del-detalle'

export default function CargandoUnidad() {
  return (
    <div className={CLASE_DEL_ALTO_DEL_DETALLE}>
      <EsqueletoDeLaUnidad />
    </div>
  )
}
