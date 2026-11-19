import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDeLosColores } from '@/modules/cotizaciones/pantallas/diseno-colores'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { MarcoDeCotizacion } from '../../marco-de-cotizacion'
import { parteGeneral } from '../../seccion'
import { abrirGeneral } from '../abrir'

export const metadata: Metadata = { title: 'Colores' }

// Configuración › Cotización › General › Colores: el catálogo de colores de la hoja y de la tarjeta, para toda la empresa. Cada cambio se guarda
// al instante. Pide `cotizaciones.configurar` en algún origen.
export default async function PaginaDeLosColores() {
  const abierto = await abrirGeneral('colores')
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <MarcoDeCotizacion parte={parteGeneral('colores')} pestanas={abierto.pestanas}>
      <Suspense fallback={<EsqueletoFormulario bloques={2} campos={2} />}>
        <SeccionDeLosColores />
      </Suspense>
    </MarcoDeCotizacion>
  )
}
