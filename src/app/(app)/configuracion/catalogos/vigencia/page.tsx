import type { Metadata } from 'next'
import { Suspense } from 'react'
import { puedeCambiarAjustesDeCotizacion } from '@/modules/empresa'
import { puede } from '@/modules/equipo'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { abrirCatalogo } from '../abrir'
import { MarcoDelCatalogo } from '../marco-del-catalogo'
import { SeccionVigencia } from './seccion'

export const metadata: Metadata = { title: 'Vigencia' }

// Configuración › Catálogos › Vigencia: cuántos días vale una cotización. La ve quien tiene `cotizaciones.configurar` en algún origen y la
// cambia quien la tiene en todos (`puedeCambiarAjustesDeCotizacion`); la base vuelve a exigirlo.
export default async function PaginaDeLaVigencia() {
  const abierto = await abrirCatalogo('vigencia')
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  const { permisos } = abierto.sesion
  return (
    <MarcoDelCatalogo sub={abierto.sub}>
      <Suspense fallback={<EsqueletoFormulario bloques={1} campos={2} />}>
        <SeccionVigencia
          puedeCambiar={puedeCambiarAjustesDeCotizacion(permisos)}
          puedeIrARoles={
            puede(permisos, 'equipo.roles.ver') || puede(permisos, 'equipo.roles.gestionar')
          }
        />
      </Suspense>
    </MarcoDelCatalogo>
  )
}
