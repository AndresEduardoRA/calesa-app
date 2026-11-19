import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDelDiseno } from '@/modules/cotizaciones/pantallas/diseno'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { PaginaPorOrigen } from '../pagina-por-origen'

export const metadata: Metadata = { title: 'Hoja' }

// Configuración › Cotización › un origen › Hoja: cómo se ve y se llena la cotización (el diseño de la hoja). Con `?vista=412|1280|200`, la vista
// previa en vivo; desde `xl`, al costado.
export default async function PaginaDeLaHoja({
  params,
}: PageProps<'/configuracion/cotizacion/[origen]/hoja'>) {
  return (
    <PaginaPorOrigen
      id={(await params).origen}
      pestana="hoja"
      ancho="ancho"
      contenido={(origen) => (
        <Suspense key={origen.id} fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
          <SeccionDelDiseno origen={origen} />
        </Suspense>
      )}
    />
  )
}
