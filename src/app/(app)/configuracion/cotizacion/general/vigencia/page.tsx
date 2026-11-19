import type { Metadata } from 'next'
import { Suspense } from 'react'
import { puedeCambiarAjustesDeCotizacion } from '@/modules/empresa'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { puedeVerNiveles } from '../../acceso'
import { MarcoDeCotizacion } from '../../marco-de-cotizacion'
import { parteGeneral } from '../../seccion'
import { abrirGeneral } from '../abrir'
import { SeccionVigencia } from './seccion'

export const metadata: Metadata = { title: 'Vigencia' }

// Configuración › Cotización › General › Vigencia: cuántos días vale una cotización. La ve quien tiene `cotizaciones.configurar` en algún origen
// y la cambia quien la tiene en todos (`puedeCambiarAjustesDeCotizacion`); la base vuelve a exigirlo.
export default async function PaginaDeLaVigencia() {
  const abierto = await abrirGeneral('vigencia')
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  const { permisos } = abierto.sesion
  return (
    <MarcoDeCotizacion parte={parteGeneral('vigencia')} pestanas={abierto.pestanas}>
      <Suspense fallback={<EsqueletoFormulario bloques={1} campos={2} />}>
        <SeccionVigencia
          puedeCambiar={puedeCambiarAjustesDeCotizacion(permisos)}
          puedeIrARoles={puedeVerNiveles(permisos)}
        />
      </Suspense>
    </MarcoDeCotizacion>
  )
}
