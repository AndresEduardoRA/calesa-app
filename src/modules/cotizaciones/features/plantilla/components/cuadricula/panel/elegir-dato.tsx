'use client'

import { useId, useMemo, useState } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import type { ContenidoDeLaCelda } from '../../../../../entities/cuadricula-de-la-tarjeta'
import {
  acotarDatos,
  mostrarQueAdmite,
  nodosParaElegir,
  NOMBRES_DE_MOSTRAR,
  VARIABLES_PARA_ELEGIR,
  type GrupoParaElegir,
} from '../../../../../entities/plantilla/edicion/datos-para-elegir'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { Eleccion } from './eleccion'

type Props = {
  // Lo que muestra la celda ahora, si es un dato.
  actual: Extract<ContenidoDeLaCelda, { tipo: 'dato' }> | null
  contexto: ContextoDePlantilla
  // Los nodos que la plantilla ya nombra (un restringido se lista marcado).
  nombrados: ReadonlySet<string>
  alElegir: (contenido: ContenidoDeLaCelda) => void
}

const CLASE_DEL_GRUPO = 'px-2 text-(length:--text-xs) font-semibold text-(--color-ink-soft)'

const CLASE_DE_LA_OPCION =
  'flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-(--radius-sm) px-2 text-left text-(length:--text-sm) outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus) aria-pressed:bg-(--color-primario-soft) aria-pressed:font-medium md:min-h-8'

type PropsDeLaLista = {
  texto: string
  actual: Props['actual']
  grupos: readonly GrupoParaElegir[]
  contexto: ContextoDePlantilla
  alElegir: Props['alElegir']
}

// La lista de lo que se puede mostrar: las variables de la cotización y, por grupo, los nodos (a lo sumo 50, con «Escribe para acotar.»).
function ListaDeDatos({ texto, actual, grupos, contexto, alElegir }: PropsDeLaLista) {
  const acotados = acotarDatos(grupos, texto)
  const buscado = texto.trim().toLocaleLowerCase('es')
  const variables = VARIABLES_PARA_ELEGIR.filter(
    (v) => buscado === '' || v.nombre.toLocaleLowerCase('es').includes(buscado),
  )
  const nodo = actual !== null && 'nodo' in actual ? actual : null
  return (
    <div className="grid max-h-72 min-w-0 gap-2 overflow-y-auto rounded-(--radius-md) border border-(--color-line) p-1">
      {variables.length === 0 ? null : (
        <section aria-label="De la cotización" className="grid gap-0.5">
          <h5 className={CLASE_DEL_GRUPO}>De la cotización</h5>
          {variables.map((v) => (
            <button
              key={v.clave}
              type="button"
              aria-pressed={actual !== null && 'variable' in actual && actual.variable === v.clave}
              className={CLASE_DE_LA_OPCION}
              onClick={() => {
                alElegir({ tipo: 'dato', variable: v.clave })
              }}
            >
              {v.nombre}
            </button>
          ))}
        </section>
      )}
      {acotados.grupos.map((g) => (
        <section key={g.id ?? 'otros'} aria-label={g.etiqueta} className="grid gap-0.5">
          <h5 className={CLASE_DEL_GRUPO}>{g.etiqueta}</h5>
          {g.nodos.map((n) => (
            <button
              key={n.id}
              type="button"
              aria-pressed={nodo?.nodo === n.id}
              data-nodo-para-elegir={n.id}
              className={CLASE_DE_LA_OPCION}
              onClick={() => {
                const admite = mostrarQueAdmite(n.id, contexto)
                alElegir({
                  tipo: 'dato',
                  nodo: n.id,
                  mostrar: nodo !== null && admite.includes(nodo.mostrar) ? nodo.mostrar : 'monto',
                })
              }}
            >
              <span className="min-w-0 truncate">{n.etiqueta}</span>
              {n.restringido ? (
                <span className="shrink-0 text-(length:--text-xs) text-(--color-aviso-ink)">
                  Restringido
                </span>
              ) : null}
            </button>
          ))}
        </section>
      ))}
      {acotados.hayMas ? (
        <p className="px-2 py-1 text-(length:--text-xs) text-(--color-ink-soft)">
          Escribe para acotar.
        </p>
      ) : null}
    </div>
  )
}

// «Dato»: las variables de la cotización y los nodos de la fórmula publicada del nivel «todos», por grupo, con «Qué mostrar» del nodo elegido. Se dibujan a lo sumo
// 50: son datos de configuración, sin base. Un nodo restringido que la plantilla ya nombra se ve marcado.
export function ElegirDato({ actual, contexto, nombrados, alElegir }: Props) {
  const id = useId()
  const [texto, setTexto] = useState('')
  const grupos = useMemo(() => nodosParaElegir(contexto, nombrados), [contexto, nombrados])
  const nodo = actual !== null && 'nodo' in actual ? actual : null
  return (
    <div className="grid min-w-0 gap-2" data-elegir-dato="">
      <div className="grid gap-1">
        <Label htmlFor={id}>Buscar un dato</Label>
        <Input
          id={id}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
          }}
          className="min-h-11 md:min-h-9"
        />
      </div>
      <ListaDeDatos
        texto={texto}
        actual={actual}
        grupos={grupos}
        contexto={contexto}
        alElegir={alElegir}
      />
      {nodo === null ? null : (
        <Eleccion
          etiqueta="Qué mostrar"
          valor={nodo.mostrar}
          opciones={mostrarQueAdmite(nodo.nodo, contexto).map((m) => ({
            valor: m,
            texto: NOMBRES_DE_MOSTRAR[m],
          }))}
          alCambiar={(mostrar) => {
            alElegir({ tipo: 'dato', nodo: nodo.nodo, mostrar })
          }}
        />
      )}
    </div>
  )
}
