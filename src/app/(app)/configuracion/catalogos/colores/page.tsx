import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDeLosColores } from '@/modules/cotizaciones/pantallas/diseno-colores'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { abrirCatalogo } from '../abrir'
import { MarcoDelCatalogo } from '../marco-del-catalogo'

export const metadata: Metadata = { title: 'Colores' }

// Configuración › Catálogos › Colores: el catálogo de colores de la hoja y de la tarjeta, para toda la empresa. Cada cambio se guarda al
// instante. Pide `cotizaciones.configurar` en algún origen.
export default async function PaginaDeLosColores() {
  const abierto = await abrirCatalogo('colores')
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <MarcoDelCatalogo sub={abierto.sub}>
      <Suspense fallback={<EsqueletoFormulario bloques={2} campos={2} />}>
        <SeccionDeLosColores />
      </Suspense>
    </MarcoDelCatalogo>
  )
}
