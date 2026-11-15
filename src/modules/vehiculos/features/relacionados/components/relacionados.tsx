'use client'

import type { ReactNode } from 'react'
import {
  accionesDelGrupo,
  accionesDeTodoVacio,
  type AccionDeRelacionados,
  type ContextoDeAcciones,
} from '../../../entities/acciones-de-relacionados'
import {
  TEXTO_DE_TODO_VACIO,
  todoVacio,
  type GrupoDeRelacionados,
  type GruposDeRelacionados,
} from '../../../entities/relacionados'
import { AccionSuelta, claveDeLaAccion } from './accion-suelta'
import { UnGrupoDeRelacionados } from './grupo-de-relacionados'

type Props<Contraparte> = {
  grupos: GruposDeRelacionados<Contraparte>
  contexto: ContextoDeAcciones
  enCurso: boolean
  alElegir: (accion: AccionDeRelacionados) => void
  // Las filas de un grupo (`<li>`), armadas por quien conoce a la contraparte.
  filasDe: (grupo: GrupoDeRelacionados<Contraparte>) => ReactNode
  // «Ver todos» de un grupo: hay más que ver (el vínculo anterior de un vehículo, o más filas) y a dónde lleva; null = nada más.
  verTodosDe: (
    grupo: GrupoDeRelacionados<Contraparte>,
  ) => { href: string } | { abrir: () => void } | null
}

// La presentación compartida del bloque «Relacionados»: tres grupos (Vinculado, Interesado y, con `cotizaciones.ver`, Cotizado), igual desde cualquier detalle. Si no hay nada (ni
// lo que no se ve), una sola línea con las acciones. Los datos, las acciones y las filas las pone quien lo usa.
export function Relacionados<Contraparte>({
  grupos,
  contexto,
  enCurso,
  alElegir,
  filasDe,
  verTodosDe,
}: Props<Contraparte>) {
  const lista = [grupos.vinculado, grupos.interesado, grupos.cotizado].filter(
    (grupo): grupo is GrupoDeRelacionados<Contraparte> => grupo !== null,
  )
  return (
    <section aria-label="Relacionados" className="@container grid min-w-0 gap-2">
      <h2 className="text-(length:--text-sm) font-medium text-(--color-ink)">Relacionados</h2>
      {todoVacio(grupos) ? (
        <div className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)">
          <p>{TEXTO_DE_TODO_VACIO}</p>
          {accionesDeTodoVacio(contexto).map((accion) => (
            <AccionSuelta
              key={claveDeLaAccion(accion)}
              accion={accion}
              enCurso={enCurso}
              alElegir={alElegir}
            />
          ))}
        </div>
      ) : (
        <div
          className={`grid min-w-0 gap-3 ${lista.length === 3 ? '@3xl:grid-cols-3' : '@3xl:grid-cols-2'}`}
        >
          {lista.map((grupo) => (
            <UnGrupoDeRelacionados
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
            </UnGrupoDeRelacionados>
          ))}
        </div>
      )}
    </section>
  )
}
