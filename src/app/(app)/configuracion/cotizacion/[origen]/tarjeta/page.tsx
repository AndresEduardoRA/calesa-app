import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDeLaPlantilla } from '@/modules/cotizaciones/pantallas/plantilla'
import { VistaPreviaDeLaPlantillaDiferida } from '@/modules/cotizaciones/pantallas/tarjeta-plantilla'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { PaginaPorOrigen } from '../pagina-por-origen'

export const metadata: Metadata = { title: 'Tarjeta' }

// Configuración › Cotización › un origen › Tarjeta: la imagen que recibe el cliente (la plantilla de la tarjeta de la cotización), con su vista
// previa al costado desde `xl` (`?panel=publicar-tarjeta`, `descartar-plantilla`).
export default async function PaginaDeLaTarjeta({
  params,
}: PageProps<'/configuracion/cotizacion/[origen]/tarjeta'>) {
  return (
    <PaginaPorOrigen
      id={(await params).origen}
      pestana="tarjeta"
      ancho="ancho"
      contenido={(origen) => (
        <Suspense key={origen.id} fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
          <SeccionDeLaPlantilla origen={origen} VistaPrevia={VistaPreviaDeLaPlantillaDiferida} />
        </Suspense>
      )}
    />
  )
}
