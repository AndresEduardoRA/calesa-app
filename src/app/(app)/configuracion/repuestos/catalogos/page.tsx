import type { Metadata } from 'next'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { CATALOGOS_DE_REPUESTOS_EN_CONFIGURACION } from '../seccion'
import { SeccionCatalogos } from './seccion'

export const metadata: Metadata = { title: CATALOGOS_DE_REPUESTOS_EN_CONFIGURACION.titulo }

// Configuración › Repuestos › Catálogos (8.08-3): los cuatro catálogos que se eligen en cada ítem. Entra quien tiene `repuestos.configurar`; sin la
// clave, «No tienes permiso».
export default async function PaginaDeCatalogosDeRepuestos() {
  const { permisos } = await requerirSesion()
  if (!puede(permisos, 'repuestos.configurar')) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <EncabezadoDeConfiguracion {...CATALOGOS_DE_REPUESTOS_EN_CONFIGURACION} />
      <Suspense fallback={<EsqueletoFormulario bloques={4} campos={3} />}>
        <SeccionCatalogos />
      </Suspense>
    </div>
  )
}
