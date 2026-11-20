import type { Metadata } from 'next'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { COTIZADOR_DE_REPUESTOS_EN_CONFIGURACION } from '../seccion'
import { SeccionCotizador } from './seccion'

export const metadata: Metadata = { title: COTIZADOR_DE_REPUESTOS_EN_CONFIGURACION.titulo }

// Configuración › Repuestos › Cotizador de repuestos (8.12-2): la fórmula, los tramos de logística y las cajas. Entra quien tiene
// `repuestos.configurar`; sin la clave, «No tienes permiso». Cada modal (`?panel=tramo|caja`) tiene su URL.
export default async function PaginaDelCotizadorDeRepuestos() {
  const { permisos } = await requerirSesion()
  if (!puede(permisos, 'repuestos.configurar')) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <EncabezadoDeConfiguracion {...COTIZADOR_DE_REPUESTOS_EN_CONFIGURACION} />
      <Suspense fallback={<EsqueletoFormulario bloques={3} campos={3} />}>
        <SeccionCotizador />
      </Suspense>
    </div>
  )
}
