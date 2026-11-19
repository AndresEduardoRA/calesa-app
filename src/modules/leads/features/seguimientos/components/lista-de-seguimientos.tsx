'use client'

import { MessageSquareTextIcon } from 'lucide-react'
import { EstadoVacio } from '@/shared/ui/estados'
import { puedeEditarSeguimiento } from '../../../entities/seguimiento'
import type { useEliminarSeguimiento } from '../hooks/use-eliminar-seguimiento'
import type { Seguimientos } from '../hooks/use-seguimientos'
import { FilaDeSeguimiento } from './fila-de-seguimiento'
import { ItemDeSeguimiento } from './item-de-seguimiento'

type Props = {
  seguimientos: Seguimientos
  zona: string
  alEditar: (id: string) => void
  eliminacion: ReturnType<typeof useEliminarSeguimiento>
  // En el bloque de la ficha: los primeros `tope`, en la línea de tiempo compacta. Sin él (el drawer «Ver todos»), todos, en tarjetas.
  tope?: number
}

// Los seguimientos, o el vacío. Editar y eliminar, sólo lo propio con la cartera.
export function ListaDeSeguimientos({ seguimientos, zona, alEditar, eliminacion, tope }: Props) {
  const { puedoAnotar } = seguimientos
  const resumen = tope !== undefined
  if (seguimientos.lista.length === 0 && seguimientos.desde !== null) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        No hay seguimientos hasta esa fecha.
      </p>
    )
  }
  if (seguimientos.lista.length === 0) {
    return resumen ? (
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">Sin seguimientos todavía.</p>
    ) : (
      <EstadoVacio
        compacto
        Icono={MessageSquareTextIcon}
        titulo="Todavía no hay seguimientos"
        descripcion={
          puedoAnotar
            ? 'Cada contacto con este lead queda acá. Anota el primero.'
            : 'Cada contacto con este lead queda acá.'
        }
      />
    )
  }
  const lista = resumen ? seguimientos.lista.slice(0, tope) : seguimientos.lista
  const propsDe = (s: (typeof lista)[number]) => ({
    seguimiento: s,
    zona,
    editable: puedeEditarSeguimiento(s, puedoAnotar),
    enCurso: eliminacion.enCurso,
    alEditar: () => {
      alEditar(s.id)
    },
    alEliminar: () => void eliminacion.eliminar(s),
  })
  if (resumen) {
    // La línea de tiempo: una línea vertical une los círculos de los tipos (el último no la sigue).
    return (
      <ol className="grid min-w-0 grid-cols-[minmax(0,1fr)]">
        {lista.map((s) => (
          <li
            key={s.id}
            className="relative min-w-0 pb-3 before:absolute before:top-8 before:bottom-0 before:left-4 before:w-px before:bg-(--color-line) last:pb-0 last:before:hidden"
          >
            <FilaDeSeguimiento {...propsDe(s)} />
          </li>
        ))}
      </ol>
    )
  }
  return (
    <ol className="grid gap-2">
      {lista.map((s) => (
        // Fuera de la vista no se dibuja: cargar 500 no cuesta 500 dibujos.
        <li key={s.id} className="[contain-intrinsic-size:auto_9rem] [content-visibility:auto]">
          <ItemDeSeguimiento {...propsDe(s)} />
        </li>
      ))}
    </ol>
  )
}
