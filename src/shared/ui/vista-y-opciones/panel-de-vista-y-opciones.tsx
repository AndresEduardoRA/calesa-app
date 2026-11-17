'use client'

import { XIcon } from 'lucide-react'
import {
  useCallback,
  useMemo,
  useRef,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import { useAlMenos } from '../ancho-de-pantalla'
import { Button } from '../button'
import { Popover, PopoverContent, PopoverTitle } from '../popover'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '../sheet'
import { useEnLinea } from '../use-en-linea'
import { ContextoDeVistaYOpciones, type ControlDeVistaYOpciones } from './contexto'
import { SeccionesDeVistaYOpciones } from './secciones'
import type { GrupoDeVistaYOpciones } from './tipos'

const TITULO = 'Vista y opciones'
export const AVISO_SIN_RED = 'Sin conexión: lo que necesita la red se activa cuando vuelva.'

type Props = {
  abierto: boolean
  alCambiarAbierto: (abierto: boolean) => void
  boton: RefObject<HTMLButtonElement | null>
  grupos: readonly GrupoDeVistaYOpciones[]
}

// El cuerpo, igual en el popover y en la hoja: la línea sin red y las secciones. Un clic en un enlace cierra el panel (lleva a otra lista o
// pantalla; si no, al volver, la pantalla que conserva su estado aparecería con el panel abierto).
function Cuerpo(props: { grupos: readonly GrupoDeVistaYOpciones[]; alEnlace: () => void }) {
  const enLinea = useEnLinea()
  return (
    <div
      onClickCapture={(evento: MouseEvent<HTMLDivElement>) => {
        if (evento.target instanceof Element && evento.target.closest('a[href]')) {
          props.alEnlace()
        }
      }}
    >
      {enLinea ? null : (
        <p
          role="status"
          className="border-b border-(--color-line) px-3 py-2 text-(length:--text-sm) text-(--color-ink-soft)"
        >
          {AVISO_SIN_RED}
        </p>
      )}
      <SeccionesDeVistaYOpciones grupos={props.grupos} enLinea={enLinea} />
    </div>
  )
}

// Desde 768 px, un popover bajo el botón.
function ComoPopover(props: Props & { alCerrarDelTodo: () => void; children: ReactNode }) {
  const { abierto, alCambiarAbierto, boton } = props
  return (
    <Popover
      open={abierto}
      onOpenChange={(sigue, detalle) => {
        // El clic en el botón con el panel abierto lo resuelve el botón (alterna): si el popover también lo cerrara por «clic afuera», el
        // botón lo volvería a abrir.
        if (
          !sigue &&
          detalle.reason === 'outside-press' &&
          detalle.event.target instanceof Node &&
          boton.current?.contains(detalle.event.target)
        ) {
          return
        }
        alCambiarAbierto(sigue)
      }}
      onOpenChangeComplete={(sigue) => {
        if (!sigue) props.alCerrarDelTodo()
      }}
    >
      <PopoverContent
        anchor={boton}
        align="end"
        // Siempre bajo el botón, sin taparlo: si no cabe, se acorta al alto disponible y se desplaza adentro.
        collisionAvoidance={{ side: 'none', align: 'shift', fallbackAxisSide: 'none' }}
        finalFocus={boton}
        className="max-h-(--available-height) w-[22rem] max-w-(--available-width) gap-0 overflow-y-auto p-0"
      >
        <PopoverTitle className="sr-only">{TITULO}</PopoverTitle>
        {props.children}
      </PopoverContent>
    </Popover>
  )
}

// Por debajo de 768 px, una hoja inferior con su título y una ✕ de 44 px, como la de «Filtros».
function ComoHoja(props: Props & { alCerrarDelTodo: () => void; children: ReactNode }) {
  const { abierto, alCambiarAbierto, boton } = props
  return (
    <Sheet
      open={abierto}
      onOpenChange={alCambiarAbierto}
      onOpenChangeComplete={(sigue) => {
        if (!sigue) props.alCerrarDelTodo()
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        finalFocus={boton}
        className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-(--radius-card)"
      >
        <SheetHeader className="flex-row items-center justify-between gap-2 border-b border-(--color-line) py-1 pr-1">
          <SheetTitle>{TITULO}</SheetTitle>
          <SheetClose render={<Button variant="ghost" className="size-11 shrink-0 p-0" />}>
            <XIcon aria-hidden />
            <span className="sr-only">Cerrar</span>
          </SheetClose>
        </SheetHeader>
        {props.children}
      </SheetContent>
    </Sheet>
  )
}

// El panel de «Vista y opciones». `abierto` vive en el botón: cambiar el ancho pasa del popover a la hoja (o al revés) sin cerrarse.
export function PanelDeVistaYOpciones(props: Props) {
  const { alCambiarAbierto } = props
  const ancho = useAlMenos(CORTE_DE_LA_TABLA)
  // Lo que corre al terminar de cerrarse (`cerrarYLuego`).
  const pendiente = useRef<(() => void) | null>(null)
  const { boton } = props
  const alCerrarDelTodo = useCallback(() => {
    const accion = pendiente.current
    pendiente.current = null
    if (accion) {
      // El foco en el botón antes de abrir lo que sigue: quien abre otro panel lo marca como el que lo abrió (`abrirConVuelta()`).
      boton.current?.focus()
      accion()
    }
  }, [boton])
  const control = useMemo<ControlDeVistaYOpciones>(
    () => ({
      cerrar: () => {
        alCambiarAbierto(false)
      },
      cerrarYLuego: (accion) => {
        pendiente.current = accion
        alCambiarAbierto(false)
      },
    }),
    [alCambiarAbierto],
  )
  const cuerpo = (
    <ContextoDeVistaYOpciones value={control}>
      <Cuerpo grupos={props.grupos} alEnlace={control.cerrar} />
    </ContextoDeVistaYOpciones>
  )
  return ancho ? (
    <ComoPopover {...props} alCerrarDelTodo={alCerrarDelTodo}>
      {cuerpo}
    </ComoPopover>
  ) : (
    <ComoHoja {...props} alCerrarDelTodo={alCerrarDelTodo}>
      {cuerpo}
    </ComoHoja>
  )
}
