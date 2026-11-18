import { connection } from 'next/server'
import { cache, Suspense, type ReactNode } from 'react'
import { requerirSesion } from '@/modules/equipo'
import { RUTAS } from '@/shared/lib/rutas'
import { CabeceraDeConfiguracion } from './_navegacion/cabecera-de-configuracion'
import { EnUnaSeccion } from './_navegacion/en-una-seccion'
import { MenuDeConfiguracion } from './_navegacion/menu-de-configuracion'
import { gruposVisibles, paraElNavegador, type GrupoDelNavegador } from './secciones'

// El marco de toda página de Configuración. Dentro de una sección: a la izquierda el menú de Configuración (desde 1024 px y con 44 rem
// de contenedor: con el texto al 200 % el rem crece y el menú pasa al selector sin desbordar) y arriba «‹ Configuración» con el selector
// de sección donde no se ve el menú. En el inicio, nada de eso: las tarjetas ya son el menú. Sin ninguna sección que abrir, tampoco:
// la página dice «No tienes permiso». Las páginas no esperan a la sesión del menú: su `loading.tsx` se ve igual que siempre. Mientras
// el menú y la cabecera llegan, su lugar queda reservado (la página no salta al llegar).
// 8 rem: a 1280 px deja a Equipo el ancho para un correo de 38 letras entero (`equipo-200`); un título largo se parte en dos líneas.
const CLASE_DEL_MENU = 'hidden w-32 shrink-0 lg:@min-[44rem]/configuracion:block'
const CLASE_DE_LA_CABECERA = 'min-h-[44px] md:min-h-9'

export default function LayoutDeConfiguracion({ children }: { children: ReactNode }) {
  return (
    <div className="@container/configuracion flex min-w-0 gap-4">
      <EnUnaSeccion inicio={RUTAS.configuracion}>
        <Suspense fallback={<div className={CLASE_DEL_MENU} />}>
          <MenuLateral />
        </Suspense>
      </EnUnaSeccion>
      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] content-start gap-4">
        <EnUnaSeccion inicio={RUTAS.configuracion}>
          <Suspense fallback={<div className={CLASE_DE_LA_CABECERA} />}>
            <Cabecera />
          </Suspense>
        </EnUnaSeccion>
        {children}
      </div>
    </div>
  )
}

// Una vez por request: el menú y el selector reciben los mismos arreglos de sub-secciones y el payload manda cada uno una sola vez.
const gruposDeQuienMira = cache(async (): Promise<GrupoDelNavegador[]> => {
  await connection()
  const { permisos } = await requerirSesion()
  return paraElNavegador(gruposVisibles(permisos))
})

async function MenuLateral() {
  const grupos = await gruposDeQuienMira()
  if (grupos.length === 0) {
    return null
  }
  return (
    <div className={CLASE_DEL_MENU}>
      <MenuDeConfiguracion grupos={grupos} />
    </div>
  )
}

async function Cabecera() {
  const grupos = await gruposDeQuienMira()
  if (grupos.length === 0) {
    return null
  }
  return <CabeceraDeConfiguracion grupos={grupos} />
}
