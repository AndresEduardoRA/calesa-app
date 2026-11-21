import type { Metadata } from 'next'
import { Suspense } from 'react'
import { puede } from '@/modules/equipo'
import { EsqueletoTabla } from '@/shared/ui/esqueletos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { abrirCatalogo } from '../abrir'
import { MarcoDelCatalogo } from '../marco-del-catalogo'
import { SeccionQuienCreaYQuienVe } from './seccion'

export const metadata: Metadata = { title: 'Quién crea y quién ve' }

// Configuración › Catálogos › Quién crea y quién ve: por rol y por origen (`?origen=`), si crea cotizaciones y cuáles ve. Son permisos de la matriz de
// Roles: se abre con `equipo.roles.ver` y se cambia con `equipo.roles.gestionar` (la base vuelve a decidir la dominancia en cada RPC).
export default async function PaginaDeQuienCreaYQuienVe() {
  const abierto = await abrirCatalogo('quien-crea-y-quien-ve')
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <MarcoDelCatalogo sub={abierto.sub}>
      <Suspense fallback={<EsqueletoTabla filas={6} columnas={3} />}>
        <SeccionQuienCreaYQuienVe
          misPermisos={abierto.sesion.permisos}
          puedeGestionar={puede(abierto.sesion.permisos, 'equipo.roles.gestionar')}
        />
      </Suspense>
    </MarcoDelCatalogo>
  )
}
