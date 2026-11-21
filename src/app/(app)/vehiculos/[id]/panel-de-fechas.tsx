import { connection } from 'next/server'
import { leerSubasta, type Vehiculo } from '@/modules/vehiculos'
import { PanelDeFechasDeSubasta } from '@/modules/vehiculos/pantallas/ficha'
import { datosO } from '@/shared/lib/errores'

// El modal de «Editar fechas de subasta» (`?panel=fechas-de-subasta`) con las fechas de ahora, leídas tras su `<Suspense>` sin frenar la ficha. Sin lectura no hay modal: la URL a mano no
// abre nada.
export async function PanelDeFechas({ vehiculo }: { vehiculo: Vehiculo }) {
  await connection()
  const subasta = datosO(await leerSubasta(vehiculo.id))
  if (!subasta) {
    return null
  }
  return (
    <PanelDeFechasDeSubasta
      vehiculoId={vehiculo.id}
      actualizadoEn={vehiculo.actualizadoEn}
      fechas={{ subastaEn: subasta.subastaEn, subastaFinEn: subasta.subastaFinEn }}
      ahora={new Date().toISOString()}
    />
  )
}
