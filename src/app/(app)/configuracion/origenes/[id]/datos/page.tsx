import type { Metadata } from 'next'
import { DatosDelOrigen } from '@/modules/origenes/pantallas/origen-datos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { abrirOrigen } from '../abrir-origen'
import { MarcoDelOrigen } from '../marco-del-origen'

export const metadata: Metadata = { title: 'Datos del origen' }

// Configuración › Orígenes › un origen › Datos: el nombre, el sustantivo, el color y las plataformas, con la barra de cambios sin guardar,
// y debajo activar, desactivar o eliminar el origen.
export default async function PaginaDatosDelOrigen({
  params,
}: PageProps<'/configuracion/origenes/[id]/datos'>) {
  const abierto = await abrirOrigen((await params).id)
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  const { sesion, origen, puedeGestionar } = abierto
  return (
    <MarcoDelOrigen origen={origen} permisos={sesion.permisos} parte="datos">
      <DatosDelOrigen origen={origen} puedeGestionar={puedeGestionar} />
    </MarcoDelOrigen>
  )
}
