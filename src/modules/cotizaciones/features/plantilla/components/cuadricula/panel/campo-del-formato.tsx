'use client'

import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignVerticalJustifyCenterIcon,
  AlignVerticalJustifyEndIcon,
  AlignVerticalJustifyStartIcon,
  BoldIcon,
  ItalicIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import {
  TAMANOS_DE_LETRA,
  type EstiloDeLaCelda,
  type TamanoDeLetra,
} from '../../../../../entities/cuadricula-de-la-tarjeta'
import type { CambioDeEstilo } from '../../../../../entities/plantilla/edicion/estilo'
import { Eleccion } from './eleccion'
import { OpcionesEnFila } from './opciones-en-fila'

type Props = {
  // Lo que comparten las celdas elegidas (una clave ausente: difieren).
  comun: EstiloDeLaCelda
  alCambiar: (cambio: CambioDeEstilo) => void
}

const ALINEAR = [
  {
    valor: 'izquierda',
    texto: 'A la izquierda',
    icono: <AlignLeftIcon aria-hidden className="size-4" />,
  },
  {
    valor: 'centro',
    texto: 'Al centro',
    icono: <AlignCenterIcon aria-hidden className="size-4" />,
  },
  {
    valor: 'derecha',
    texto: 'A la derecha',
    icono: <AlignRightIcon aria-hidden className="size-4" />,
  },
] as const
const ALINEAR_VERTICAL = [
  {
    valor: 'arriba',
    texto: 'Arriba',
    icono: <AlignVerticalJustifyStartIcon aria-hidden className="size-4" />,
  },
  {
    valor: 'centro',
    texto: 'Al medio',
    icono: <AlignVerticalJustifyCenterIcon aria-hidden className="size-4" />,
  },
  {
    valor: 'abajo',
    texto: 'Abajo',
    icono: <AlignVerticalJustifyEndIcon aria-hidden className="size-4" />,
  },
] as const

function Interruptor(props: {
  etiqueta: string
  activo: boolean | undefined
  icono: ReactNode
  alCambiar: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={props.activo === true}
      aria-label={props.etiqueta}
      title={props.etiqueta}
      onClick={() => {
        props.alCambiar(props.activo !== true)
      }}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-(--radius-sm) border border-(--color-line) outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus) aria-pressed:bg-(--color-primario-soft) md:min-h-8 md:min-w-8"
    >
      {props.icono}
    </button>
  )
}

// «Formato» de lo elegido: negrita, cursiva, el tamaño (la escala de 8 pasos) y la alineación horizontal y vertical.
export function CampoDelFormato({ comun, alCambiar }: Props) {
  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex min-w-0 flex-wrap items-end gap-2">
        <Interruptor
          etiqueta="Negrita"
          activo={comun.negrita}
          icono={<BoldIcon aria-hidden className="size-4" />}
          alCambiar={(negrita) => {
            alCambiar({ negrita })
          }}
        />
        <Interruptor
          etiqueta="Cursiva"
          activo={comun.cursiva}
          icono={<ItalicIcon aria-hidden className="size-4" />}
          alCambiar={(cursiva) => {
            alCambiar({ cursiva })
          }}
        />
        <div className="min-w-0 flex-1">
          <Eleccion
            etiqueta="Tamaño"
            valor={comun.tamano === undefined ? '' : String(comun.tamano)}
            vacia="Distintos"
            opciones={TAMANOS_DE_LETRA.map((t) => ({ valor: String(t), texto: `${String(t)} px` }))}
            alCambiar={(t) => {
              alCambiar({ tamano: Number(t) as TamanoDeLetra })
            }}
          />
        </div>
      </div>
      <OpcionesEnFila
        etiqueta="Alineación horizontal"
        valor={comun.alinear ?? null}
        opciones={ALINEAR}
        alElegir={(alinear) => {
          alCambiar({ alinear })
        }}
      />
      <OpcionesEnFila
        etiqueta="Alineación vertical"
        valor={comun.alinear_vertical ?? null}
        opciones={ALINEAR_VERTICAL}
        alElegir={(v) => {
          alCambiar({ alinear_vertical: v })
        }}
      />
    </div>
  )
}
