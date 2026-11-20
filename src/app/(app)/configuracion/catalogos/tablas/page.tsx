import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDeLasTablas } from '@/modules/cotizaciones/pantallas/tablas'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { unParametro } from '@/shared/lib/rutas'
import { abrirCatalogo } from '../abrir'
import { MarcoDelCatalogo } from '../marco-del-catalogo'

export const metadata: Metadata = { title: 'Tablas compartidas' }

// Configuración › Catálogos › Tablas compartidas: las tablas de referencia sin origen, que usa cada origen que no tiene la propia, y con
// `?tabla=` su editor. Pide `cotizaciones.configurar`; la base vuelve a exigirlo al publicar.
export default async function PaginaDeLasTablasCompartidas({
  searchParams,
}: PageProps<'/configuracion/catalogos/tablas'>) {
  const [abierto, parametros] = await Promise.all([abrirCatalogo('tablas'), searchParams])
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  const tablaPedida = unParametro(parametros['tabla'])
  return (
    <MarcoDelCatalogo sub={abierto.sub}>
      <Suspense key={tablaPedida ?? ''} fallback={<EsqueletoFormulario bloques={1} campos={4} />}>
        <SeccionDeLasTablas destino="compartidas" tablaPedida={tablaPedida} />
      </Suspense>
    </MarcoDelCatalogo>
  )
}
