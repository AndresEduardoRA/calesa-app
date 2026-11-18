import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { redirigir } from '@/shared/lib/navegacion'
import { RUTAS } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { EncabezadoDeConfiguracion } from '../_navegacion/encabezado-de-configuracion'
import { primeraSubseccionAbierta } from '../secciones'
import { CATALOGOS_DE_LOGISTICA, catalogosVisibles } from './catalogos'
import { SECCION_DE_LOGISTICA } from './seccion'

// La página de un catálogo de Configuración › Logística (`/configuracion/logistica/<clave>`): su título, una frase y el catálogo. Cada sub-ruta
// es un `page.tsx` de una línea que trae su clave. Entra quien tiene `logistica.catalogos.gestionar`; sin la clave, «No tienes permiso». Un
// catálogo que la persona no puede abrir lleva al primero que sí; uno que ningún área llenó, a «no encontrada». La base vuelve a exigir lo
// suyo en cada escritura.
export function metadataDeCatalogo(clave: string): Metadata {
  return { title: CATALOGOS_DE_LOGISTICA.find((c) => c.clave === clave)?.titulo ?? 'Logística' }
}

export async function PaginaDeCatalogoDeLogistica({ clave }: { clave: string }) {
  const { permisos } = await requerirSesion()
  if (!puede(permisos, 'logistica.catalogos.gestionar')) {
    return <EstadoSinPermiso />
  }
  const catalogo = CATALOGOS_DE_LOGISTICA.find((c) => c.clave === clave)
  if (catalogo === undefined) {
    notFound()
  }
  if (!catalogosVisibles(permisos).some((visible) => visible.clave === clave)) {
    redirigir(
      primeraSubseccionAbierta(SECCION_DE_LOGISTICA, permisos) ?? RUTAS.configuracionDeLogistica,
    )
  }
  const Catalogo = catalogo.componente
  return (
    <div className="grid max-w-3xl gap-4">
      <EncabezadoDeConfiguracion titulo={catalogo.titulo} descripcion={catalogo.descripcion} />
      <Suspense fallback={<EsqueletoFormulario bloques={1} campos={4} />}>
        <Catalogo />
      </Suspense>
    </div>
  )
}
