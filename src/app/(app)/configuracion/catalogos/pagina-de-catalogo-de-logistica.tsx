import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { abrirCatalogo } from './abrir'
import { CATALOGOS_DE_LOGISTICA } from './catalogos-de-logistica'
import { MarcoDelCatalogo } from './marco-del-catalogo'

// La página de un catálogo de logística en Configuración › Catálogos (`/configuracion/catalogos/<clave>`): su título, una frase y el catálogo.
// Cada sub-ruta es un `page.tsx` de una línea que trae su clave. Sin el permiso del catálogo, el primero que la persona abre (`abrirCatalogo`);
// sin ninguno, «No tienes permiso». Uno que el módulo no llena, «no encontrada». La base vuelve a exigir lo suyo en cada escritura.
export function metadataDeCatalogo(clave: string): Metadata {
  return { title: CATALOGOS_DE_LOGISTICA.find((c) => c.clave === clave)?.titulo ?? 'Catálogos' }
}

export async function PaginaDeCatalogoDeLogistica({ clave }: { clave: string }) {
  const catalogo = CATALOGOS_DE_LOGISTICA.find((c) => c.clave === clave)
  if (catalogo === undefined) {
    notFound()
  }
  const abierto = await abrirCatalogo(clave)
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  const Catalogo = catalogo.componente
  return (
    <MarcoDelCatalogo sub={abierto.sub}>
      <Suspense fallback={<EsqueletoFormulario bloques={1} campos={4} />}>
        <Catalogo />
      </Suspense>
    </MarcoDelCatalogo>
  )
}
