// La visibilidad que compila la base al publicar una plantilla de V1 (`_compilar_visibilidad()`), para un diseño sin niveles: lo que dibuja una celda, un subtotal,
// la variante o un interruptor (y el `pct` de una celda con secundario), más el total y lo aparte, todo del nivel «todos». Lo que no se dibuja no figura, y la
// tarjeta no lo puede nombrar. La usan la vista previa del modal (la lectura de la tarjeta con cifras de ejemplo) y las pruebas de cada paquete. Pura.
import type { PlantillaDeV1 } from './tipos'

export type VisibilidadDeTodos = Readonly<
  Record<string, { readonly ver: 'todos'; readonly editar: 'todos' }>
>

export function visibilidadDeLaPlantilla(p: Pick<PlantillaDeV1, 'formula'>): VisibilidadDeTodos {
  const { definicion, diseno } = p.formula
  const pct = new Map(definicion.nodos.map((n) => [n.id, 'pct' in n ? n.pct : undefined]))
  const dibujados = diseno.secciones.flatMap((s) =>
    s.items.flatMap((i) => {
      if (i.tipo === 'atajos') return []
      const conPct = i.tipo === 'celda' && i.secundario !== undefined ? pct.get(i.nodo) : undefined
      return conPct === undefined ? [i.nodo] : [i.nodo, conPct]
    }),
  )
  const salidas = definicion.nodos
    .filter((n) => n.salida === 'total' || n.salida === 'aparte')
    .map((n) => n.id)
  return Object.fromEntries(
    [...dibujados, ...salidas].map((id) => [id, { ver: 'todos', editar: 'todos' } as const]),
  )
}
