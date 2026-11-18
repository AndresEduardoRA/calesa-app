'use client'

import { usePathname } from 'next/navigation'
import { EnlaceDelMenu } from './enlace-del-menu'
import { rutaResuelta } from './marca'
import { RenglonApagado } from './renglon-apagado'

// Las sub-secciones de una sección en el menú, con cada plantilla rellenada con la ruta actual (las partes del origen que se ve). La que
// no resuelve no se dibuja; si no resuelve ninguna, tampoco la lista. La índice (en la ruta de su sección) se marca sólo en su ruta; la
// que no se puede abrir va apagada con su motivo. Se esconde por CSS mientras su sección no está marcada.
export function SubseccionesDelMenu({
  claveDeSeccion,
  rutaDeSeccion,
  subsecciones,
}: {
  claveDeSeccion: string
  rutaDeSeccion: string
  subsecciones: readonly { clave: string; titulo: string; ruta: string; motivo?: string }[]
}) {
  const actual = usePathname()
  const resueltas = subsecciones.flatMap((sub) => {
    const ruta = rutaResuelta(sub.ruta, actual)
    return ruta === null ? [] : [{ ...sub, ruta }]
  })
  if (resueltas.length === 0) {
    return null
  }
  return (
    <ul className="grid gap-0.5 pl-3">
      {resueltas.map((sub) => (
        <li key={sub.clave}>
          {sub.motivo === undefined ? (
            <EnlaceDelMenu
              ruta={sub.ruta}
              exacta={sub.ruta === rutaDeSeccion}
              titulo={sub.titulo}
            />
          ) : (
            <RenglonApagado
              clave={`${claveDeSeccion}-${sub.clave}`}
              titulo={sub.titulo}
              motivo={sub.motivo}
            />
          )}
        </li>
      ))}
    </ul>
  )
}
