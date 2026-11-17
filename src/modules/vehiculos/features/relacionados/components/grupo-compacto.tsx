'use client'

import { useId } from 'react'
import { conteoCorto } from '@/shared/lib/conteo'
import type { AccionDeRelacionados } from '../../../entities/acciones-de-relacionados'
import {
  LEYENDAS,
  NOMBRE_DEL_TIPO,
  textoDeOcultos,
  type GrupoDeRelacionados,
  type LadoDeRelacionados,
} from '../../../entities/relacionados'
import { AccionesDeLaFila } from './acciones-de-la-fila'
import { VerTodosDelGrupo, type VerTodosDeUnGrupo } from './ver-todos-del-grupo'

type Props = {
  lado: LadoDeRelacionados
  grupo: GrupoDeRelacionados<unknown>
  // Lo que se ofrece en el grupo mismo (marcar, desvincular un vínculo que no se ve): en su «⋯».
  acciones: readonly AccionDeRelacionados[]
  alElegir: (accion: AccionDeRelacionados) => void
  enCurso: boolean
  verTodos: VerTodosDeUnGrupo | null
  // Las filas ya armadas (`<li>`).
  children: React.ReactNode
}

// Un grupo de «Relacionados» compacto (las fichas): una línea de título con la cantidad, «Ver todos» y el «⋯» del grupo; sus primeras filas y lo que no se ve contado. Sin borde ni leyenda a la
// vista: la leyenda es el `title` del título y la descripción del grupo para el lector. Nunca se dibuja vacío (`gruposALaVista()`).
export function GrupoCompacto({
  lado,
  grupo,
  acciones,
  alElegir,
  enCurso,
  verTodos,
  children,
}: Props) {
  const nombre = NOMBRE_DEL_TIPO[grupo.tipo]
  const leyenda = LEYENDAS[lado][grupo.tipo]
  const idLeyenda = useId()
  return (
    <section
      aria-label={nombre}
      aria-describedby={idLeyenda}
      className="grid min-w-0 content-start gap-1.5"
    >
      {/* Del alto del «⋯» aunque no lo haya: los títulos de las columnas quedan a la misma altura. */}
      <div className="flex min-h-11 min-w-0 flex-wrap items-center gap-x-2 md:min-h-8">
        <h3 title={leyenda} className="text-(length:--text-sm) font-medium text-(--color-ink)">
          {nombre}
          <span className="font-normal text-(--color-ink-soft) tabular-nums">
            {' · '}
            {conteoCorto(grupo.conteo)}
          </span>
        </h3>
        {verTodos ? <VerTodosDelGrupo verTodos={verTodos} /> : null}
        <AccionesDeLaFila
          nombre={`«${nombre}»`}
          acciones={acciones}
          enCurso={enCurso}
          alElegir={alElegir}
        />
      </div>
      <p id={idLeyenda} className="sr-only">
        {leyenda}
      </p>
      {grupo.filas.length > 0 ? (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">{children}</ul>
      ) : null}
      {grupo.ocultos > 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {textoDeOcultos(grupo.ocultos)}
        </p>
      ) : null}
    </section>
  )
}
