'use client'

import { Trash2Icon, Undo2Icon } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { BotonesDeOrden } from '@/shared/ui/lista-de-catalogo/botones-de-orden'
import type { Direccion } from '@/shared/ui/lista-de-catalogo/tipos'
import type { ColumnaEnEdicion } from '../../../entities/tablas/edicion-de-columnas'
import {
  ETIQUETA_DEL_TIPO,
  LARGO_MAXIMO_DE_LA_ETIQUETA,
  TIPOS_DE_COLUMNA,
  esTipoDeColumna,
} from '../../../entities/tablas/estructura'

type Props = {
  columna: ColumnaEnEdicion
  // `columnas.<i>` en lo que se manda (sin las que se quitan): el camino de sus errores. Nulo si se quita.
  camino: string | null
  // Su lugar en la lista (desde 1), para nombrar el campo de una columna sin nombre.
  numero: number
  porCampo: Readonly<Record<string, string>>
  prefijo: string
  puedeSubir: boolean
  puedeBajar: boolean
  puedeQuitar: boolean
  enCurso: boolean
  alMover: (direccion: Direccion) => void
  alQuitar: () => void
  alNoQuitar: () => void
  alEscribirEtiqueta: (etiqueta: string) => void
  alEscribirClave: (clave: string) => void
  alElegirTipo: (tipo: string) => void
}

const SELECT =
  'h-11 w-full min-w-0 rounded-lg border border-(--color-line-strong) bg-(--color-surface) px-2.5 text-(length:--text-base) text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus) disabled:opacity-50 aria-invalid:border-(--color-peligro) md:h-9 md:text-(length:--text-sm)'

// Los atributos de un campo con su error debajo (`aria-invalid` y el texto que lo describe).
const conError = (id: string, texto: string | undefined) =>
  texto ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {}

function Error({ id, texto }: { id: string; texto: string | undefined }) {
  return texto ? (
    <p
      id={`${id}-error`}
      className="text-(length:--text-sm) break-words text-(--color-peligro-ink)"
    >
      {texto}
    </p>
  ) : null
}

function ColumnaQueSeQuita({ props }: { props: Props }) {
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-2 rounded-(--radius-card) border border-dashed border-(--color-line) p-3 text-(length:--text-sm)">
      <span className="min-w-0 break-words text-(--color-ink-soft) line-through">
        {props.columna.etiqueta}
      </span>
      <Badge variant="outline">Se quita</Badge>
      <Button
        type="button"
        variant="ghost"
        className="ml-auto min-h-11 md:min-h-8"
        disabled={props.enCurso}
        onClick={props.alNoQuitar}
      >
        <Undo2Icon aria-hidden className="size-4" />
        No quitar
      </Button>
    </li>
  )
}

type DeLaNueva = {
  props: Props
  id: string
  nombre: string
  errorDe: (campo: string) => string | undefined
}

// El tipo y la clave de una columna nueva (los de una que ya existe no cambian).
function CamposDeLaNueva({ props, id, nombre, errorDe }: DeLaNueva) {
  const { columna, enCurso } = props
  return (
    <div className="grid min-w-0 gap-2 @md:grid-cols-2">
      <div className="grid min-w-0 gap-1">
        <select
          id={`${id}-tipo`}
          aria-label={`Tipo de ${nombre}`}
          {...conError(`${id}-tipo`, errorDe('tipo'))}
          value={columna.tipo}
          disabled={enCurso}
          className={SELECT}
          onChange={(evento) => {
            props.alElegirTipo(evento.target.value)
          }}
        >
          {TIPOS_DE_COLUMNA.map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_DEL_TIPO[t]}
            </option>
          ))}
        </select>
        <Error id={`${id}-tipo`} texto={errorDe('tipo')} />
      </div>
      <div className="grid min-w-0 gap-1">
        <Input
          id={`${id}-clave`}
          value={columna.clave}
          aria-label={`Clave de ${nombre}`}
          {...conError(`${id}-clave`, errorDe('clave'))}
          spellCheck={false}
          autoCapitalize="none"
          disabled={enCurso}
          className="h-11 font-mono md:h-9"
          onChange={(evento) => {
            props.alEscribirClave(evento.target.value)
          }}
        />
        <Error id={`${id}-clave`} texto={errorDe('clave')} />
      </div>
    </div>
  )
}

function TipoYClave({ columna }: { columna: ColumnaEnEdicion }) {
  const tipo = esTipoDeColumna(columna.tipo) ? ETIQUETA_DEL_TIPO[columna.tipo] : columna.tipo
  return (
    <p className="text-(length:--text-sm) break-all text-(--color-ink-soft)">
      {tipo} · <span className="font-mono">{columna.clave}</span>
    </p>
  )
}

// Una columna en el editor: su nombre (la etiqueta) y, si es nueva, su tipo y su clave (que sigue al nombre hasta que se toca). Una que ya existe muestra su tipo y su
// clave como texto: no cambian. «Quitar» saca una nueva; una existente queda tachada con «Se quita» y «No quitar».
export function FilaDeColumna(props: Props) {
  const { columna, camino, porCampo, prefijo, enCurso } = props
  if (columna.seQuita) return <ColumnaQueSeQuita props={props} />
  const nombre =
    columna.etiqueta.trim() === '' ? `la columna ${String(props.numero)}` : columna.etiqueta
  const id = `${prefijo}-${columna.llave}`
  const errorDe = (campo: string) => (camino ? porCampo[`${camino}.${campo}`] : undefined)
  return (
    <li className="grid min-w-0 gap-2 rounded-(--radius-card) border border-(--color-line) p-3">
      <div className="flex min-w-0 items-start gap-2">
        <div className="grid min-w-0 flex-1 gap-1">
          <Input
            id={`${id}-etiqueta`}
            value={columna.etiqueta}
            aria-label={`Nombre de la columna ${String(props.numero)}`}
            {...conError(`${id}-etiqueta`, errorDe('etiqueta'))}
            placeholder="Nombre"
            maxLength={LARGO_MAXIMO_DE_LA_ETIQUETA + 10}
            disabled={enCurso}
            className="h-11 md:h-9"
            onChange={(evento) => {
              props.alEscribirEtiqueta(evento.target.value)
            }}
          />
          <Error id={`${id}-etiqueta`} texto={errorDe('etiqueta')} />
        </div>
        <BotonesDeOrden
          prefijo={prefijo}
          id={columna.llave}
          nombre={nombre}
          puedeSubir={props.puedeSubir && !enCurso}
          puedeBajar={props.puedeBajar && !enCurso}
          alMover={props.alMover}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 md:size-8"
          aria-label={`Quitar ${nombre}`}
          title={props.puedeQuitar ? undefined : 'Una tabla tiene al menos una columna.'}
          disabled={!props.puedeQuitar || enCurso}
          onClick={props.alQuitar}
        >
          <Trash2Icon aria-hidden />
        </Button>
      </div>
      {columna.nueva ? (
        <CamposDeLaNueva props={props} id={id} nombre={nombre} errorDe={errorDe} />
      ) : (
        <TipoYClave columna={columna} />
      )}
    </li>
  )
}
