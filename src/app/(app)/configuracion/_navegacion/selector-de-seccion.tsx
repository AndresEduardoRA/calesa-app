'use client'

import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'
import { Fragment, useId } from 'react'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import type { GrupoDelNavegador } from '../secciones'
import { marcaDelEnlace, rutaResuelta } from './marca'

// El selector de sección del celular y de las pantallas angostas: las mismas secciones que el menú, por grupo. Elegir navega; con una
// barra de cambios sin guardar, antes pregunta (`salirSinPerder()`). El valor sale de la ruta: si se sigue editando, vuelve solo a la
// sección de antes. Un `<select>` nativo: lo más liviano y lo que el teclado y el lector ya saben usar.
export function SelectorDeSeccion({ grupos }: { grupos: readonly GrupoDelNavegador[] }) {
  const actual = usePathname()
  const router = useRouter()
  const id = useId()
  // Una sub-sección plantilla (las partes de un origen) se ofrece sólo si resuelve con la ruta actual.
  const resueltas = (subsecciones: GrupoDelNavegador['secciones'][number]['subsecciones']) =>
    subsecciones.flatMap((sub) => {
      const ruta = rutaResuelta(sub.ruta, actual)
      return ruta === null ? [] : [{ ...sub, ruta }]
    })
  const rutas = grupos.flatMap((grupo) =>
    grupo.secciones.flatMap((seccion) => [
      { ruta: seccion.ruta, subrutas: seccion.subsecciones.map((sub) => sub.ruta) },
      ...resueltas(seccion.subsecciones).map((sub) => ({ ruta: sub.ruta, subrutas: [] })),
    ]),
  )
  const valor =
    rutas.find(({ ruta, subrutas }) => marcaDelEnlace(actual, ruta, subrutas) === 'page')?.ruta ??
    ''
  return (
    <div className="flex min-w-0 items-center gap-2">
      <label htmlFor={id} className="text-(length:--text-sm) text-(--color-ink-soft)">
        Sección
      </label>
      <select
        id={id}
        value={valor}
        onChange={(evento) => {
          const ruta = evento.target.value
          salirSinPerder(() => {
            router.push(ruta as Route)
          })
        }}
        className="h-[44px] max-w-full min-w-0 flex-1 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-2 text-(length:--text-sm) text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus) md:h-9"
      >
        {valor === '' ? <option value="">Elige una sección</option> : null}
        {grupos.map((grupo) => (
          <optgroup key={grupo.clave} label={grupo.titulo}>
            {grupo.secciones.map((seccion) => (
              <Fragment key={seccion.clave}>
                <option value={seccion.ruta}>{seccion.titulo}</option>
                {resueltas(seccion.subsecciones).map((sub) => (
                  <option key={sub.clave} value={sub.ruta}>
                    {`${seccion.titulo} › ${sub.titulo}`}
                  </option>
                ))}
              </Fragment>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
