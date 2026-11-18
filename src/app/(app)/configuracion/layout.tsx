import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'
import { requerirSesion } from '@/modules/equipo'
import { RUTAS } from '@/shared/lib/rutas'
import { CabeceraDeConfiguracion } from './_navegacion/cabecera-de-configuracion'
import { EnUnaSeccion } from './_navegacion/en-una-seccion'
import { MenuDeConfiguracion } from './_navegacion/menu-de-configuracion'
import { gruposVisibles, paraElNavegador, type GrupoDelNavegador } from './secciones'

// El marco de toda página de Configuración. Dentro de una sección: a la izquierda el menú de Configuración (desde 1024 px y con 44 rem
// de contenedor: con el texto al 200 % el rem crece y el menú pasa al selector sin desbordar) y arriba «‹ Configuración» con el selector
// de sección donde no se ve el menú. En el inicio, nada de eso: las tarjetas ya son el menú. Sin ninguna sección que abrir, tampoco:
// la página dice «No tienes permiso». Las páginas no esperan a la sesión del menú: su `loading.tsx` se ve igual que siempre.
export default function LayoutDeConfiguracion({ children }: { children: ReactNode }) {
  return (
    <div className="@container/configuracion flex min-w-0 gap-6">
      <Suspense fallback={null}>
        <MenuLateral />
      </Suspense>
      <div className="grid min-w-0 flex-1 content-start gap-4">
        <Suspense fallback={null}>
          <Cabecera />
        </Suspense>
        {children}
      </div>
    </div>
  )
}

async function gruposDeQuienMira(): Promise<GrupoDelNavegador[]> {
  await connection()
  const { permisos } = await requerirSesion()
  return paraElNavegador(gruposVisibles(permisos))
}

async function MenuLateral() {
  const grupos = await gruposDeQuienMira()
  if (grupos.length === 0) {
    return null
  }
  return (
    <EnUnaSeccion inicio={RUTAS.configuracion}>
      <div className="hidden w-52 shrink-0 lg:@min-[44rem]/configuracion:block">
        <MenuDeConfiguracion grupos={grupos} />
      </div>
    </EnUnaSeccion>
  )
}

async function Cabecera() {
  const grupos = await gruposDeQuienMira()
  if (grupos.length === 0) {
    return null
  }
  return (
    <EnUnaSeccion inicio={RUTAS.configuracion}>
      <CabeceraDeConfiguracion grupos={grupos} />
    </EnUnaSeccion>
  )
}
