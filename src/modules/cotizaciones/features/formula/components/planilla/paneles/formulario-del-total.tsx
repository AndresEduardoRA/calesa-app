'use client'

import { useId, useState } from 'react'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { Formula } from '../../../../../entities/formula'
import {
  filasQuePuedenSerElTotal,
  type CambiosDelTotal,
  type ErrorDelTotal,
} from '../../../../../entities/formula/total-de-la-formula'

type Props = {
  trabajo: Formula
  errores: readonly ErrorDelTotal[]
  alAplicar: (cambios: CambiosDelTotal) => void
  alCancelar: () => void
}

const SIN_ELEGIR = { valor: '', etiqueta: 'Elige una fila', deshabilitada: true }

const opcionesDe = (nodos: readonly { id: string; etiqueta: string }[]) => [
  SIN_ELEGIR,
  ...nodos.map((n) => ({ valor: n.id, etiqueta: n.etiqueta })),
]

// Lo que el panel muestra al abrir: el tipo de cambio del total, la fila del total y el tipo de cambio de cada bucket.
function inicialDe(trabajo: Formula) {
  const { definicion } = trabajo
  return {
    totalEn: definicion.total_en ?? '',
    filaDelTotal: definicion.nodos.find((n) => n.salida === 'total')?.id ?? '',
    buckets: { ...(definicion.buckets ?? {}) },
  }
}

// «Total y tipos de cambio» (D14): el tipo de cambio que pasa el total a moneda, la fila del total y el tipo de cambio de cada bucket (las bandas los usan). Un error
// queda junto a su campo; cerrar con algo cambiado pregunta.
export function FormularioDelTotal({ trabajo, errores, alAplicar, alCancelar }: Props) {
  const uid = useId()
  const [inicial] = useState(() => inicialDe(trabajo))
  const [elegido, setElegido] = useState(inicial)
  const hayCambios = JSON.stringify(elegido) !== JSON.stringify(inicial)
  useCambiosSinGuardar(hayCambios, undefined, { preguntaAlCerrar: true })
  const tiposDeCambio = opcionesDe(trabajo.definicion.nodos.filter((n) => n.tipo === 'tipo_cambio'))
  const deError = (campo: ErrorDelTotal['campo'], bucket?: string) =>
    errores.find((e) => e.campo === campo && e.bucket === bucket)?.mensaje
  return (
    <form
      id={`${uid}-total`}
      className="grid min-w-0 gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        alAplicar({
          ...(elegido.totalEn === '' ? {} : { totalEn: elegido.totalEn }),
          ...(elegido.filaDelTotal === '' ? {} : { filaDelTotal: elegido.filaDelTotal }),
          buckets: elegido.buckets,
        })
      }}
    >
      <CampoSeleccion
        nombre={`${uid}-total_en`}
        etiqueta="Tipo de cambio del total"
        ayuda="Pasa el total en dólares a moneda local."
        opciones={tiposDeCambio}
        value={elegido.totalEn}
        error={deError('total_en')}
        onChange={(e) => {
          setElegido({ ...elegido, totalEn: e.target.value })
        }}
      />
      <CampoSeleccion
        nombre={`${uid}-fila_del_total`}
        etiqueta="Fila del total"
        ayuda="Un monto que no suma a ninguna banda."
        opciones={opcionesDe(filasQuePuedenSerElTotal(trabajo))}
        value={elegido.filaDelTotal}
        error={deError('fila_del_total')}
        onChange={(e) => {
          setElegido({ ...elegido, filaDelTotal: e.target.value })
        }}
      />
      {Object.entries(elegido.buckets).map(([bucket, tc]) => (
        <CampoSeleccion
          key={bucket}
          nombre={`${uid}-bucket-${bucket}`}
          etiqueta={`Tipo de cambio de «${bucket}»`}
          opciones={tiposDeCambio}
          value={tc}
          error={deError('buckets', bucket)}
          onChange={(e) => {
            setElegido({ ...elegido, buckets: { ...elegido.buckets, [bucket]: e.target.value } })
          }}
        />
      ))}
      <PieDelPanel
        idFormulario={`${uid}-total`}
        enCurso={false}
        alCancelar={alCancelar}
        etiquetaDeGuardar="Aplicar"
      />
    </form>
  )
}
