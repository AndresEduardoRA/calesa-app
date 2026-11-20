'use client'

import type { ReactNode } from 'react'
import { TituloDeBloqueConAccion } from '@/shared/ui/ficha-en-bloques'
import { TITULO_DE_BLOQUE } from '@/shared/ui/ficha-en-bloques/estilos'
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
  // El título del bloque con su única acción (la ficha del lead: «Vehículos» con «Vincular o marcar»). Sin esto, «Relacionados» sin acción (la ficha
  // del vehículo).
  encabezado?: EncabezadoDeRelacionados
  // La frase de todo vacío (sin esto, `TEXTO_DE_TODO_VACIO`).
  vacio?: string
}

export type EncabezadoDeRelacionados = { titulo: string; accion?: ReactNode }

const ID_DEL_TITULO = 'relacionados-titulo'

// El título propio (`encabezado`): un `h2` con `id` (lo nombra la región) y `tabIndex={-1}` (lo enfoca el índice al saltar), con su acción a la derecha
// (o a lo ancho debajo de 24 rem) y, si hay, el «⋯» de lo que no tiene grupo pegado a ella.
function TituloPropio({ titulo, accion, mas }: EncabezadoDeRelacionados & { mas: ReactNode }) {
  const acciones =
    accion && mas ? (
      <div className="flex min-w-0 gap-1 [&>*:first-child]:grow">
        {accion}
        {mas}
      </div>
    ) : (
      (accion ?? mas)
    )
  return <TituloDeBloqueConAccion id={ID_DEL_TITULO} titulo={titulo} accion={acciones} />
}

// «Relacionados» compacto (las fichas): el título («Relacionados», o el de `encabezado` con su acción) con el «⋯» de lo que no tiene grupo a la vista, y los grupos con algo en columnas que caben y que llenan el ancho (una
// en el celular o en una lateral angosta; en pantallas grandes, una grilla que se adapta a cuántos grupos hay, sin columnas vacías: `auto-fit`; en rem, así
// con el texto al 200 % caen columnas en vez de ensanchar). Si no hay nada, la frase con una acción a la vista.
export function RelacionadosCompactos<Contraparte>({
  grupos,
  contexto,
  enCurso,
  alElegir,
  filasDe,
  verTodosDe,
  encabezado,
  vacio = TEXTO_DE_TODO_VACIO,
}: Props<Contraparte>) {
  const lista = gruposALaVista(grupos)
  const fuera = accionesFueraDeLosGrupos(grupos, contexto)
  const mas = (
    <AccionesDeLaFila
      nombre={`«${encabezado?.titulo ?? 'Relacionados'}»`}
      acciones={fuera.resto}
      enCurso={enCurso}
      alElegir={alElegir}
    />
  )
  const region = encabezado
    ? { 'aria-labelledby': ID_DEL_TITULO }
    : { 'aria-label': 'Relacionados' }
  return (
    <section {...region} className="grid min-w-0 gap-2">
      {encabezado ? (
        <TituloPropio
          titulo={encabezado.titulo}
          accion={encabezado.accion}
          mas={fuera.resto.length > 0 ? mas : null}
        />
      ) : (
        <div className="flex min-h-11 min-w-0 items-center gap-1 md:min-h-8">
          <h2 className={TITULO_DE_BLOQUE}>Relacionados</h2>
          {mas}
        </div>
      )}
      {lista.length === 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)">
          <p>{vacio}</p>
          {fuera.principal ? (
            <AccionSuelta accion={fuera.principal} enCurso={enCurso} alElegir={alElegir} />
          ) : null}
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-x-4 gap-y-3">
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
