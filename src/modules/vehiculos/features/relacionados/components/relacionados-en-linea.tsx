'use client'

import { useState, type ReactNode } from 'react'
import { conteoCorto } from '@/shared/lib/conteo'
import { Popover, PopoverTrigger } from '@/shared/ui/popover'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  accionesDelGrupo,
  accionesDeTodoVacio,
  type AccionDeRelacionados,
  type ContextoDeAcciones,
} from '../../../entities/acciones-de-relacionados'
import {
  NOMBRE_DEL_TIPO,
  TEXTO_DE_TODO_VACIO,
  todoVacio,
  type GrupoDeRelacionados,
  type GruposDeRelacionados,
} from '../../../entities/relacionados'
import { AccionSuelta, claveDeLaAccion } from './accion-suelta'
import { PopoverDelGrupoDiferido } from './diferidos'

type Props<Contraparte> = {
  grupos: GruposDeRelacionados<Contraparte>
  contexto: ContextoDeAcciones
  enCurso: boolean
  alElegir: (accion: AccionDeRelacionados) => void
  filasDe: (grupo: GrupoDeRelacionados<Contraparte>) => ReactNode
  verTodosDe: (
    grupo: GrupoDeRelacionados<Contraparte>,
  ) => { href: string } | { abrir: () => void } | null
}

const CHIP =
  'inline-flex min-h-11 items-center gap-1 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 text-(length:--text-sm) text-(--color-ink) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:min-h-8'

// Un chip por grupo: «Vinculado · 3». El grupo entero (filas, acciones y «Ver todos») está en un popover cuyo código se pide recién al abrirlo.
function ChipDelGrupo<Contraparte>({
  grupo,
  contexto,
  enCurso,
  alElegir,
  filasDe,
  verTodosDe,
}: Props<Contraparte> & { grupo: GrupoDeRelacionados<Contraparte> }) {
  const [abierto, setAbierto] = useState(false)
  const montar = useAbiertoAlgunaVez(abierto)
  const verTodos = verTodosDe(grupo)
  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger className={CHIP}>
        {NOMBRE_DEL_TIPO[grupo.tipo]}{' '}
        <span className="text-(--color-ink-soft) tabular-nums">
          {'· '}
          {conteoCorto(grupo.conteo)}
        </span>
      </PopoverTrigger>
      {montar ? (
        <PopoverDelGrupoDiferido
          lado={contexto.ancla.lado}
          grupo={grupo}
          acciones={accionesDelGrupo(
            { tipo: grupo.tipo, filas: grupo.filas.length, ocultos: grupo.ocultos },
            contexto,
          )}
          alElegir={(accion) => {
            setAbierto(false)
            alElegir(accion)
          }}
          enCurso={enCurso}
          // Un drawer no se abre desde un popover: se cierra primero.
          verTodos={
            verTodos !== null && 'abrir' in verTodos
              ? {
                  abrir: () => {
                    setAbierto(false)
                    verTodos.abrir()
                  },
                }
              : verTodos
          }
        >
          {filasDe(grupo)}
        </PopoverDelGrupoDiferido>
      ) : null}
    </Popover>
  )
}

// «Relacionados» en una línea (la unidad de logística, donde el bloque de tres grupos no cabe sin desplazar): un chip por grupo con su cantidad, sin encabezado. Si no hay nada, la misma frase del
// bloque con sus acciones.
export function RelacionadosEnLinea<Contraparte>(props: Props<Contraparte>) {
  const { grupos, contexto, enCurso, alElegir } = props
  const lista = [grupos.vinculado, grupos.interesado, grupos.cotizado].filter(
    (grupo): grupo is GrupoDeRelacionados<Contraparte> => grupo !== null,
  )
  return (
    <section aria-label="Relacionados" className="flex min-w-0 flex-wrap items-center gap-2">
      {todoVacio(grupos) ? (
        <>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{TEXTO_DE_TODO_VACIO}</p>
          {accionesDeTodoVacio(contexto).map((accion) => (
            <AccionSuelta
              key={claveDeLaAccion(accion)}
              accion={accion}
              enCurso={enCurso}
              alElegir={alElegir}
            />
          ))}
        </>
      ) : (
        lista.map((grupo) => <ChipDelGrupo key={grupo.tipo} {...props} grupo={grupo} />)
      )}
    </section>
  )
}
