import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import type { GrupoDelNavegador } from '../secciones'
import { SelectorDeSeccion } from './selector-de-seccion'

// Arriba de cada página de una sección: «‹ Configuración» (la vuelta al inicio) y, donde no se ve el menú, el selector de sección. Una
// sola fila que se parte en dos si no cabe (texto al 200 %): el título de la página no baja más de lo necesario.
export function CabeceraDeConfiguracion({ grupos }: { grupos: readonly GrupoDelNavegador[] }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <Link
        href={RUTAS.configuracion}
        className="-ml-1 inline-flex min-h-[44px] items-center gap-1 rounded-(--radius-md) pr-2 pl-1 text-(length:--text-sm) text-(--color-ink-soft) outline-none hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) md:min-h-9"
      >
        <ChevronLeftIcon aria-hidden className="size-4 shrink-0" />
        Configuración
      </Link>
      <div className="max-w-full min-w-0 lg:@min-[44rem]/configuracion:hidden">
        <SelectorDeSeccion grupos={grupos} />
      </div>
    </div>
  )
}
