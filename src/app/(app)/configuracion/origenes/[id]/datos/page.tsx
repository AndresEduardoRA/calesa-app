import type { Metadata } from 'next'
import { DatosDelOrigen } from '@/modules/origenes/pantallas/origen-datos'
import { abrirOrigen } from '../abrir-origen'
import { NoSeAbre } from '../no-se-abre'

export const metadata: Metadata = { title: 'Datos del origen' }

// Configuración › Orígenes › un origen › Datos: el nombre, el sustantivo, el color y las plataformas, con la barra de cambios sin guardar.
export default async function PaginaDatosDelOrigen({
  params,
}: PageProps<'/configuracion/origenes/[id]/datos'>) {
  const abierto = await abrirOrigen((await params).id, 'datos')
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  const { origen, puedeGestionar } = abierto
  return (
    <div className="grid max-w-3xl gap-4">
      <DatosDelOrigen origen={origen} puedeGestionar={puedeGestionar} />
    </div>
  )
}
