import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDelDiseno } from '@/modules/cotizaciones/pantallas/diseno'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { abrirOrigen } from '../../abrir-origen'
import { NoSeAbre } from '../../no-se-abre'

export const metadata: Metadata = { title: 'Hoja del origen' }

// Configuración › Orígenes › un origen › Fórmula › Hoja: cómo se ve y se llena la cotización (el diseño de la hoja). Con `?vista=412|1280|200`, la vista
// previa en vivo; desde `xl`, al costado.
export default async function PaginaDeLaHoja({
  params,
}: PageProps<'/configuracion/origenes/[id]/formula/hoja'>) {
  const abierto = await abrirOrigen((await params).id, 'formula')
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  const { id, nombre, activo } = abierto.origen
  return (
    <div className="grid max-w-6xl min-w-0 gap-4">
      <Suspense fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
        <SeccionDelDiseno origen={{ id, nombre, activo }} />
      </Suspense>
    </div>
  )
}
