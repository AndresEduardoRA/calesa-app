import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EsqueletoDeNiveles } from '@/modules/cotizaciones/pantallas/configuracion'
import { puede } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { abrirCatalogo } from '../abrir'
import { MarcoDelCatalogo } from '../marco-del-catalogo'
import { SeccionNiveles } from './seccion'

export const metadata: Metadata = { title: 'Niveles' }

// Configuración › Catálogos › Niveles: quién ve y edita qué celdas de la cotización. Se abre con `equipo.roles.ver` (cada nivel es un permiso de
// la matriz de Roles) y se cambia con `equipo.roles.gestionar` (`?panel=nuevo-nivel`, `renombrar-nivel&nivel=`, `eliminar-nivel&nivel=`…).
export default async function PaginaDeLosNiveles() {
  const abierto = await abrirCatalogo('niveles')
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <MarcoDelCatalogo sub={abierto.sub}>
      <Suspense fallback={<EsqueletoDeNiveles />}>
        <SeccionNiveles puedeGestionar={puede(abierto.sesion.permisos, 'equipo.roles.gestionar')} />
      </Suspense>
    </MarcoDelCatalogo>
  )
}
