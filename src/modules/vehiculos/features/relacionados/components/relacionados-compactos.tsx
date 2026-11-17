'use client'

import type { ReactNode } from 'react'
import {
  accionesDelGrupo,
  type AccionDeRelacionados,
  type ContextoDeAcciones,
} from '../../../entities/acciones-de-relacionados'
import { accionesFueraDeLosGrupos } from '../../../entities/acciones-fuera-de-los-grupos'
import {
  TEXTO_DE_TODO_VACIO,
  gruposALaVista,
  type GrupoDeRelacionados,
  type GruposDeRelacionados,
} from '../../../entities/relacionados'
import { AccionSuelta } from './accion-suelta'
import { AccionesDeLaFila } from './acciones-de-la-fila'
import { GrupoCompacto } from './grupo-compacto'
import type { VerTodosDeUnGrupo } from './ver-todos-del-grupo'

type Props<Contraparte> = {
  grupos: GruposDeRelacionados<Contraparte>
  contexto: ContextoDeAcciones
  enCurso: boolean
  alElegir: (accion: AccionDeRelacionados) => void
  filasDe: (grupo: GrupoDeRelacionados<Contraparte>) => ReactNode
  verTodosDe: (grupo: GrupoDeRelacionados<Contraparte>) => VerTodosDeUnGrupo | null
}

// «Relacionados» compacto (las fichas): el título «Relacionados» con el «⋯» de lo que no tiene grupo a la vista, y los grupos con algo en columnas que caben (una en el celular o en una
// lateral angosta, hasta tres a lo ancho; en rem, así con el texto al 200 % caen columnas en vez de ensanchar). Si no hay nada, la frase con una acción a la vista.
export function RelacionadosCompactos<Contraparte>({
  grupos,
  contexto,
  enCurso,
  alElegir,
  filasDe,
  verTodosDe,
}: Props<Contraparte>) {
  const lista = gruposALaVista(grupos)
  const fuera = accionesFueraDeLosGrupos(grupos, contexto)
  return (
    <section aria-label="Relacionados" className="grid min-w-0 gap-2">
      <div className="flex min-h-11 min-w-0 items-center gap-1 md:min-h-8">
        <h2 className="text-(length:--text-sm) font-medium text-(--color-ink)">Relacionados</h2>
        <AccionesDeLaFila
          nombre="«Relacionados»"
          acciones={fuera.resto}
          enCurso={enCurso}
          alElegir={alElegir}
        />
      </div>
      {lista.length === 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)">
          <p>{TEXTO_DE_TODO_VACIO}</p>
          {fuera.principal ? (
            <AccionSuelta accion={fuera.principal} enCurso={enCurso} alElegir={alElegir} />
          ) : null}
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-x-4 gap-y-3">
          {lista.map((grupo) => (
            <GrupoCompacto
              key={grupo.tipo}
              lado={contexto.ancla.lado}
              grupo={grupo}
              acciones={accionesDelGrupo(
                { tipo: grupo.tipo, filas: grupo.filas.length, ocultos: grupo.ocultos },
                contexto,
              )}
              alElegir={alElegir}
              enCurso={enCurso}
              verTodos={verTodosDe(grupo)}
            >
              {filasDe(grupo)}
            </GrupoCompacto>
          ))}
        </div>
      )}
    </section>
  )
}
