import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDeLaFormula } from '@/modules/cotizaciones/pantallas/formula'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { PaginaPorOrigen } from '../pagina-por-origen'

export const metadata: Metadata = { title: 'Fórmula' }

// Configuración › Cotización › un origen › Fórmula: qué se calcula. La publicada, el borrador y las versiones (`?panel=publicar-formula`,
// `revertir-formula&version=`, `descartar-borrador`, `editar-formula`).
export default async function PaginaDeLaFormula({
  params,
}: PageProps<'/configuracion/cotizacion/[origen]/formula'>) {
  return (
    <PaginaPorOrigen
      id={(await params).origen}
      pestana="formula"
      contenido={(origen) => (
        <Suspense key={origen.id} fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
          <SeccionDeLaFormula origen={origen} />
        </Suspense>
      )}
    />
  )
}
