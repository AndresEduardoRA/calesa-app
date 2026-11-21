import { Badge } from '../badge'
import { IconoDelCatalogo } from '../icono-del-catalogo/icono-del-catalogo'

export type FilaDeListaCorta = {
  id: string
  nombre: string
  // Una clave del catálogo de iconos; sin ella, sólo el nombre.
  icono?: string | null
  activo: boolean
  // Textos cortos junto al nombre («Por defecto», «Prospecto»).
  insignias?: readonly string[]
}

// Las primeras `tope` activas, en su orden, y cuántas activas quedan fuera y cuántas están desactivadas. Puro: `filas` ya viene acotada
// (un catálogo tiene a lo sumo 100) y se cuenta sobre ella.
export function resumirLista(filas: readonly FilaDeListaCorta[], tope: number) {
  const activas = filas.filter((fila) => fila.activo)
  return {
    visibles: activas.slice(0, tope),
    mas: Math.max(0, activas.length - tope),
    desactivadas: filas.length - activas.length,
  }
}

// «y 3 más · 2 desactivados»; `null` si no hay nada que decir. Cuenta lo que ya está leído (no es un total exacto de una tabla que crece).
export function textoDelResto(mas: number, desactivadas: number): string | null {
  const partes = [
    ...(mas > 0 ? [`y ${String(mas)} más`] : []),
    ...(desactivadas > 0
      ? [`${String(desactivadas)} ${desactivadas === 1 ? 'desactivado' : 'desactivados'}`]
      : []),
  ]
  return partes.length === 0 ? null : partes.join(' · ')
}

type Props = {
  filas: readonly FilaDeListaCorta[]
  // Cuántas activas se dibujan.
  tope: number
  // Lo que se dice sin ninguna fila.
  vacio: string
}

// La lista corta de una tarjeta de catálogo: las primeras activas con su icono, su nombre y sus insignias, y debajo «y N más · M desactivados».
// Sin `'use client'`: es sólo texto y viaja en frío.
export function ListaCorta({ filas, tope, vacio }: Props) {
  if (filas.length === 0) {
    return <p className="text-(length:--text-sm) text-(--color-ink-faint)">{vacio}</p>
  }
  const { visibles, mas, desactivadas } = resumirLista(filas, tope)
  const resto = textoDelResto(mas, desactivadas)
  return (
    <div className="grid gap-2">
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
        {visibles.map((fila) => (
          <li
            key={fila.id}
            className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-(length:--text-sm) text-(--color-ink)"
          >
            <IconoDelCatalogo clave={fila.icono} className="text-(--color-ink-soft)" />
            <span className="min-w-0 break-words">{fila.nombre}</span>
            {(fila.insignias ?? []).map((texto) => (
              <Badge key={texto} variant="secondary">
                {texto}
              </Badge>
            ))}
          </li>
        ))}
      </ul>
      {resto ? <p className="text-(length:--text-xs) text-(--color-ink-faint)">{resto}</p> : null}
    </div>
  )
}
