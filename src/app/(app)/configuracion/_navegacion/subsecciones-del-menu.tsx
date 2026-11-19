'use client'

import { usePathname } from 'next/navigation'
import type { SubseccionDelNavegador } from '../secciones'
import { EnlaceDelMenu } from './enlace-del-menu'
import { rutaDelMenu } from './marca'
import { RenglonApagado } from './renglon-apagado'

type Resuelta = SubseccionDelNavegador & { ruta: string }

// Las sub-secciones resueltas, en tramos seguidos con el mismo `grupo` (sin grupo, un tramo sin rótulo).
function enTramos(resueltas: readonly Resuelta[]): { grupo?: string; subs: Resuelta[] }[] {
  const tramos: { grupo?: string; subs: Resuelta[] }[] = []
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

// Las sub-secciones de una sección en el menú, con cada plantilla rellenada con la ruta actual (las partes del origen que se ve) o, si no
// resuelve, con su respaldo. La que no resuelve ni tiene respaldo no se dibuja; si no queda ninguna, tampoco la lista. La índice (en la ruta
// de su sección) se marca sólo en su ruta; la que no se puede abrir va apagada con su motivo. Las que declaran `grupo` van bajo su rótulo
// (un `<p>`, no un encabezado, como los grupos del menú). Se esconde por CSS mientras su sección no está marcada.
export function SubseccionesDelMenu({
  claveDeSeccion,
  rutaDeSeccion,
  subsecciones,
}: {
  claveDeSeccion: string
  rutaDeSeccion: string
  subsecciones: readonly SubseccionDelNavegador[]
}) {
  const actual = usePathname()
  const resueltas = subsecciones.flatMap((sub) => {
    const ruta = rutaDelMenu(sub, actual)
    return ruta === null ? [] : [{ ...sub, ruta }]
  })
  if (resueltas.length === 0) {
    return null
  }
  const renglon = (sub: Resuelta) => (
    <li key={sub.clave}>
      {sub.motivo === undefined ? (
        <EnlaceDelMenu ruta={sub.ruta} exacta={sub.ruta === rutaDeSeccion} titulo={sub.titulo} />
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
    <ul className="grid gap-0.5 pl-3">
      {enTramos(resueltas).map((tramo, i) => {
        if (tramo.grupo === undefined) {
          return tramo.subs.map(renglon)
        }
        const idDelRotulo = `subgrupo-${claveDeSeccion}-${String(i)}`
        return (
          <li key={idDelRotulo} className="grid gap-0.5 pt-1">
            <p
              id={idDelRotulo}
              className="px-2.5 text-(length:--text-xs) font-medium text-(--color-ink-soft)"
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
