'use client'

import { conteoCorto } from '@/shared/lib/conteo'
import { AccionSuelta, claveDeLaAccion } from './accion-suelta'
import { VerTodosDelGrupo, type VerTodosDeUnGrupo } from './ver-todos-del-grupo'
import type { AccionDeRelacionados } from '../../../entities/acciones-de-relacionados'
import {
  LEYENDAS,
  NOMBRE_DEL_TIPO,
  textoDeOcultos,
  type GrupoDeRelacionados,
  type LadoDeRelacionados,
} from '../../../entities/relacionados'

type Props = {
  lado: LadoDeRelacionados
  grupo: GrupoDeRelacionados<unknown>
  // Lo que se ofrece en el grupo mismo (vincular, marcar, cotizar sin lead).
  acciones: readonly AccionDeRelacionados[]
  alElegir: (accion: AccionDeRelacionados) => void
  enCurso: boolean
  // «Ver todos»: un botón que abre el drawer; null = no hay más que ver.
  verTodos: VerTodosDeUnGrupo | null
  // Las filas ya armadas (`<li>`).
  children: React.ReactNode
}

// El grupo dentro del popover de un chip de «Relacionados en una línea»: su título con la cantidad (con tope), su leyenda, las primeras filas, lo que no se ve contado y sus acciones. Nunca
// vacío: un grupo sin nada no tiene chip.
export function UnGrupoDeRelacionados({
  lado,
  grupo,
  acciones,
  alElegir,
  enCurso,
  verTodos,
  children,
}: Props) {
  const nombre = NOMBRE_DEL_TIPO[grupo.tipo]
  return (
    <section
      aria-label={nombre}
      className="grid min-w-0 content-start gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
    >
      <header className="grid gap-0.5">
        <h3 className="text-(length:--text-sm) font-medium text-(--color-ink)">
          {nombre}
          <span className="font-normal text-(--color-ink-soft) tabular-nums">
            {' · '}
            {conteoCorto(grupo.conteo)}
          </span>
        </h3>
        <p className="text-(length:--text-xs) text-(--color-ink-soft)">
          {LEYENDAS[lado][grupo.tipo]}
        </p>
      </header>
      {grupo.filas.length > 0 ? (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">{children}</ul>
      ) : null}
      {grupo.ocultos > 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {textoDeOcultos(grupo.ocultos)}
        </p>
      ) : null}
      {acciones.length > 0 || verTodos ? (
        <div className="flex flex-wrap gap-2">
          {acciones.map((accion) => (
            <AccionSuelta
              key={claveDeLaAccion(accion)}
              accion={accion}
              enCurso={enCurso}
              alElegir={alElegir}
            />
          ))}
          {verTodos ? <VerTodosDelGrupo verTodos={verTodos} /> : null}
        </div>
      ) : null}
    </section>
  )
}
