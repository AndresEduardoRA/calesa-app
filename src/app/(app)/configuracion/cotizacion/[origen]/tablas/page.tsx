import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDeLasTablas } from '@/modules/cotizaciones/pantallas/tablas'
import { unParametro } from '@/shared/lib/rutas'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { PaginaPorOrigen } from '../pagina-por-origen'

export const metadata: Metadata = { title: 'Tablas' }

// Configuración › Cotización › un origen › Tablas: las tablas de referencia del origen y las compartidas; con `?tabla=<id>`, el editor de una
// (`?panel=publicar-tabla`).
export default async function PaginaDeLasTablas({
  params,
  searchParams,
}: PageProps<'/configuracion/cotizacion/[origen]/tablas'>) {
  const [{ origen: id }, parametros] = await Promise.all([params, searchParams])
  const tablaPedida = unParametro(parametros['tabla'])
  return (
    <PaginaPorOrigen
      id={id}
      pestana="tablas"
      contenido={(origen) => (
        <Suspense
          key={`${origen.id}:${tablaPedida ?? ''}`}
          fallback={<EsqueletoFormulario bloques={2} campos={4} />}
        >
          <SeccionDeLasTablas origen={origen} tablaPedida={tablaPedida} />
        </Suspense>
      )}
    />
  )
}
