'use client'

import { usePathname } from 'next/navigation'
import { EnlaceDelMenu } from './enlace-del-menu'
import { rutaResuelta } from './marca'

// Las sub-secciones de una sección en el menú, con cada plantilla rellenada con la ruta actual (las partes del origen que se ve). La que
// no resuelve no se dibuja; si no resuelve ninguna, tampoco la lista. Se esconde por CSS mientras su sección no está marcada.
export function SubseccionesDelMenu({
  subsecciones,
}: {
  subsecciones: readonly { clave: string; titulo: string; ruta: string }[]
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
          <EnlaceDelMenu ruta={sub.ruta} titulo={sub.titulo} />
        </li>
      ))}
    </ul>
  )
}
