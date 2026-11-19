import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EsqueletoDeNiveles } from '@/modules/cotizaciones/pantallas/configuracion'
import { puede } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { MarcoDeCotizacion } from '../../marco-de-cotizacion'
import { parteGeneral } from '../../seccion'
import { abrirGeneral } from '../abrir'
import { SeccionNiveles } from './seccion'

export const metadata: Metadata = { title: 'Niveles' }

// Configuración › Cotización › General › Niveles: quién ve y edita qué celdas. Se abre con `equipo.roles.ver` (cada nivel es un permiso de la
// matriz de Roles) y se cambia con `equipo.roles.gestionar` (`?panel=nuevo-nivel`, `renombrar-nivel&nivel=`, `eliminar-nivel&nivel=`…).
export default async function PaginaDeLosNiveles() {
  const abierto = await abrirGeneral('niveles')
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <MarcoDeCotizacion parte={parteGeneral('niveles')} pestanas={abierto.pestanas}>
      <Suspense fallback={<EsqueletoDeNiveles />}>
        <SeccionNiveles puedeGestionar={puede(abierto.sesion.permisos, 'equipo.roles.gestionar')} />
      </Suspense>
    </MarcoDeCotizacion>
  )
}
