import { connection } from 'next/server'
import { getAjustes, integracionActiva } from '@/modules/empresa'
import { leerSubasta, type Vehiculo } from '@/modules/vehiculos'
import { BloqueDeSubasta } from '@/modules/vehiculos/pantallas/ficha'
import { datosO } from '@/shared/lib/errores'

type Props = {
  vehiculo: Vehiculo
  // Si quien mira puede editar el vehículo (lo decide la base).
  editable: boolean
  // El origen trae el precio «Buy it now» de apibara (un campo activo con su clave).
  conCompraDirecta: boolean
}

// «Subasta» de un vehículo de un origen de subasta, en la columna izquierda de su ficha: la frase, el cierre, la puja y la compra directa, y «Editar
// fechas» en su «⋯». No se dibuja si el vehículo no tiene nada de la subasta, no hay cómo traerlo ni quien mira puede escribirlo.
export async function BloqueSubasta({ vehiculo, editable, conCompraDirecta }: Props) {
  await connection()
  const [subasta, ajustes, activa] = await Promise.all([
    leerSubasta(vehiculo.id),
    getAjustes(),
    integracionActiva('apibara'),
  ])
  const datos = datosO(subasta)
  // Sin nada de la subasta, sin apibara y sin poder escribir las fechas a mano, no hay nada que mostrar.
  if (
    !datos ||
    (datos.sincronizadoEn === null && datos.subastaEn === null && !activa && !editable)
  ) {
    return null
  }
  return (
    <BloqueDeSubasta
      vehiculo={vehiculo}
      situacion={vehiculo.situacion}
      subasta={{ ...datos, raw: null }}
      ahora={new Date().toISOString()}
      zona={ajustes.zonaHoraria}
      puedeRefrescar={activa && editable}
      puedeEditar={editable}
      conCompraDirecta={conCompraDirecta}
    />
  )
}
