'use client'

import { ChevronDownIcon, Redo2Icon, Undo2Icon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'
import {
  OPERACIONES_DE_LA_BARRA,
  type Disponibilidad,
} from '../../../../entities/plantilla/edicion/disponibilidad'
import {
  loQueSeDeshace,
  loQueSeRehace,
  type Historial,
} from '../../../../entities/plantilla/edicion/historial'
import type { AccionDelEditor } from '../../../../entities/plantilla/edicion/reductor'
import type { EscalaDelLienzo } from '../../../../entities/vista-previa-de-la-plantilla'
import { ItemDeOperacion } from './item-de-operacion'
import {
  DE_LA_COMBINACION,
  PARA_ELIMINAR,
  PARA_INSERTAR,
  type GrupoDeOperaciones,
} from './lista-de-operaciones'

type Props = {
  disponible: Disponibilidad
  historial: Historial<unknown>
  hacer: (accion: AccionDelEditor) => void
  ocupado: boolean
  escala: EscalaDelLienzo
  alCambiarLaEscala: (escala: EscalaDelLienzo) => void
  // El tamaño de la tarjeta dibujada, en px.
  tamano: { ancho: number; alto: number } | null
  // «Referencia:», a la derecha.
  referencia: ReactNode
  // Por qué no se hizo lo último que se pidió.
  rechazo: string | null
}

const CLASE_DEL_BOTON = 'min-h-11 md:min-h-8 aria-disabled:opacity-50'

// Un botón de la barra: apagado no deja de recibir el foco (`aria-disabled`) y al tocarlo dice por qué (el reductor lo rechaza con su motivo).
function BotonDeLaBarra(props: {
  motivo: string | null
  titulo: string
  ocupado: boolean
  alTocar: () => void
  children: ReactNode
  etiqueta?: string
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={CLASE_DEL_BOTON}
      aria-disabled={props.motivo !== null || props.ocupado}
      aria-label={props.etiqueta}
      title={props.motivo === null ? props.titulo : `${props.titulo}: ${props.motivo}`}
      onClick={() => {
        if (!props.ocupado) props.alTocar()
      }}
    >
      {props.children}
    </Button>
  )
}

function MenuDeLaBarra(props: {
  titulo: string
  operaciones: GrupoDeOperaciones
  disponible: Disponibilidad
  hacer: (accion: AccionDelEditor) => void
  ocupado: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={props.ocupado}
        className="inline-flex min-h-11 items-center gap-1 rounded-(--radius-md) border border-(--color-line-strong) bg-(--color-surface) px-2.5 text-(length:--text-sm) outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus) disabled:opacity-50 md:min-h-8"
      >
        {props.titulo}
        <ChevronDownIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-(--available-width) min-w-56">
        {props.operaciones.map((o) => (
          <ItemDeOperacion
            key={o.clave}
            texto={o.texto}
            motivo={props.disponible[o.clave]}
            alHacer={() => {
              props.hacer(OPERACIONES_DE_LA_BARRA[o.clave])
            }}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// A la derecha de la barra: la referencia, «Ajustar | 100 %» y el tamaño de la tarjeta.
function LadoDerecho(props: Pick<Props, 'referencia' | 'escala' | 'alCambiarLaEscala' | 'tamano'>) {
  return (
    <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
      {props.referencia}
      <div role="group" aria-label="Tamaño del lienzo" className="flex">
        {(['ajustar', 'real'] as const).map((e) => (
          <Button
            key={e}
            type="button"
            size="sm"
            variant={props.escala === e ? 'secondary' : 'ghost'}
            aria-pressed={props.escala === e}
            className="min-h-11 md:min-h-8"
            onClick={() => {
              props.alCambiarLaEscala(e)
            }}
          >
            {e === 'ajustar' ? 'Ajustar' : '100 %'}
          </Button>
        ))}
      </div>
      {props.tamano === null ? null : (
        <span
          className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums"
          data-tamano-del-lienzo=""
        >
          {props.tamano.ancho} × {props.tamano.alto} px
        </span>
      )}
    </div>
  )
}

// La barra del lienzo, con lo de Excel que aplica a la tarjeta y nada más: deshacer y rehacer (con lo que deshacen), combinar y separar, «Insertar» y «Eliminar»; a la
// derecha la referencia, «Ajustar | 100 %» y el tamaño de la tarjeta. Debajo, por qué no se hizo lo último (también se anuncia).
export function BarraDelLienzo(props: Props) {
  const { disponible, hacer, ocupado } = props
  const deshace = loQueSeDeshace(props.historial)
  const rehace = loQueSeRehace(props.historial)
  return (
    <div className="grid min-w-0 gap-1" data-barra-del-lienzo="">
      <div
        role="toolbar"
        aria-label="Barra del lienzo"
        className="flex min-w-0 flex-wrap items-center gap-1.5"
      >
        <BotonDeLaBarra
          etiqueta="Deshacer"
          titulo={deshace === null ? 'Deshacer (Ctrl+Z)' : `Deshacer: ${deshace} (Ctrl+Z)`}
          motivo={disponible.deshacer}
          ocupado={ocupado}
          alTocar={() => {
            hacer({ tipo: 'deshacer' })
          }}
        >
          <Undo2Icon aria-hidden className="size-4" />
        </BotonDeLaBarra>
        <BotonDeLaBarra
          etiqueta="Rehacer"
          titulo={rehace === null ? 'Rehacer (Ctrl+Y)' : `Rehacer: ${rehace} (Ctrl+Y)`}
          motivo={disponible.rehacer}
          ocupado={ocupado}
          alTocar={() => {
            hacer({ tipo: 'rehacer' })
          }}
        >
          <Redo2Icon aria-hidden className="size-4" />
        </BotonDeLaBarra>
        {DE_LA_COMBINACION.map((o) => (
          <BotonDeLaBarra
            key={o.clave}
            titulo={o.texto}
            motivo={disponible[o.clave]}
            ocupado={ocupado}
            alTocar={() => {
              hacer(OPERACIONES_DE_LA_BARRA[o.clave])
            }}
          >
            {o.texto}
          </BotonDeLaBarra>
        ))}
        <MenuDeLaBarra
          titulo="Insertar"
          operaciones={PARA_INSERTAR}
          disponible={disponible}
          hacer={hacer}
          ocupado={ocupado}
        />
        <MenuDeLaBarra
          titulo="Eliminar"
          operaciones={PARA_ELIMINAR}
          disponible={disponible}
          hacer={hacer}
          ocupado={ocupado}
        />
        <LadoDerecho
          referencia={props.referencia}
          escala={props.escala}
          alCambiarLaEscala={props.alCambiarLaEscala}
          tamano={props.tamano}
        />
      </div>
      {props.rechazo === null ? null : (
        <p
          className="text-(length:--text-sm) text-(--color-peligro-ink)"
          data-rechazo-del-lienzo=""
        >
          {props.rechazo}
        </p>
      )}
    </div>
  )
}
