'use client'

import type { SubseccionDelNavegador } from '../secciones'
import { EnlaceDelMenu } from './enlace-del-menu'
import { RenglonApagado } from './renglon-apagado'

type Sub = SubseccionDelNavegador

// Las sub-secciones en tramos seguidos con el mismo `grupo` (sin grupo, un tramo sin rótulo).
function enTramos(resueltas: readonly Sub[]): { grupo?: string; subs: Sub[] }[] {
  const tramos: { grupo?: string; subs: Sub[] }[] = []
  for (const sub of resueltas) {
    const ultimo = tramos.at(-1)
    if (ultimo && ultimo.grupo === sub.grupo) {
      ultimo.subs.push(sub)
    } else {
      tramos.push({ ...(sub.grupo === undefined ? {} : { grupo: sub.grupo }), subs: [sub] })
    }
  }
  return tramos
}

// Las sub-secciones de una sección en el menú (en Orígenes, un renglón por origen, que se marca en todas sus pestañas). Sin ninguna, no hay
// lista. La índice (en la ruta de su sección) se marca sólo en su ruta; la que no se puede abrir va apagada con su motivo. Las que declaran `grupo` van bajo su rótulo
// (un `<p>`, no un encabezado, como los grupos del menú). Van sangradas bajo su sección, con una línea guía a la izquierda. Se esconde por CSS
// mientras su sección no está marcada.
export function SubseccionesDelMenu({
  claveDeSeccion,
  rutaDeSeccion,
  subsecciones,
}: {
  claveDeSeccion: string
  rutaDeSeccion: string
  subsecciones: readonly SubseccionDelNavegador[]
}) {
  if (subsecciones.length === 0) {
    return null
  }
  const renglon = (sub: Sub) => (
    <li key={sub.clave}>
      {sub.motivo === undefined ? (
        <EnlaceDelMenu
          ruta={sub.ruta}
          marca={sub.marca}
          exacta={sub.ruta === rutaDeSeccion}
          titulo={sub.titulo}
          nivel="sub"
        />
      ) : (
        <RenglonApagado
          clave={`${claveDeSeccion}-${sub.clave}`}
          titulo={sub.titulo}
          motivo={sub.motivo}
        />
      )}
    </li>
  )
  return (
    <ul className="ml-[1.125rem] grid gap-0.5 border-l border-(--color-line)">
      {enTramos(subsecciones).map((tramo, i) => {
        if (tramo.grupo === undefined) {
          return tramo.subs.map(renglon)
        }
        const idDelRotulo = `subgrupo-${claveDeSeccion}-${String(i)}`
        return (
          <li key={idDelRotulo} className="grid gap-0.5 pt-1.5">
            <p
              id={idDelRotulo}
              className="pl-3 text-(length:--text-xs) font-medium text-(--color-ink-soft) italic"
            >
              {tramo.grupo}
            </p>
            <ul aria-labelledby={idDelRotulo} className="grid gap-0.5">
              {tramo.subs.map(renglon)}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}
