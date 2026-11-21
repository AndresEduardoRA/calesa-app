'use client'

import { useId, useState } from 'react'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  MOTIVO_SIN_DOS_OPCIONES,
  pedidoDeLaVariante,
  type VarianteEnBorrador,
} from '../../../../../entities/formula/opciones-de-la-variante'
import type { PedidoDeTipo } from '../../../../../entities/formula/tipo-de-celda'
import { MarcoDelTipo } from './marco-del-tipo'
import { OpcionesDeLaVariante } from './opciones-de-la-variante'

type Props = {
  inicial: VarianteEnBorrador
  motivo: string | null
  alAplicar: (pedido: PedidoDeTipo) => void
  alCancelar: () => void
}

function EnPar({
  uid,
  v,
  alCambiar,
}: {
  uid: string
  v: VarianteEnBorrador
  alCambiar: (enPar: boolean) => void
}) {
  const admite = v.opciones.length === 2
  return (
    <div className="grid gap-1">
      <label
        htmlFor={`${uid}-en-par`}
        className="flex min-h-11 items-center gap-2 text-(--color-ink) md:min-h-0"
      >
        <Checkbox
          id={`${uid}-en-par`}
          checked={v.enPar}
          disabled={!admite && !v.enPar}
          aria-describedby={admite ? undefined : `${uid}-en-par-motivo`}
          onCheckedChange={(valor) => {
            alCambiar(valor === true)
          }}
        />
        Se cotiza en par
      </label>
      {admite ? null : (
        <p id={`${uid}-en-par-motivo`} className="text-(--color-ink-soft)">
          {MOTIVO_SIN_DOS_OPCIONES}
        </p>
      )}
    </div>
  )
}

// «Tipo de celda › Variante» (glosario: «Variante», «Variante en par»): las opciones, la que viene elegida y si se cotiza en par. Una sola variante por fórmula.
export function FormularioDeLaVariante({ inicial, motivo, alAplicar, alCancelar }: Props) {
  const uid = useId()
  const [v, setV] = useState(inicial)
  const listo = v.opciones.length >= 2 && v.opciones.every((o) => o.etiqueta.trim() !== '')
  const opcionesPorDefecto = [
    { valor: '', etiqueta: 'Ninguna: la elige el asesor' },
    ...v.opciones.map((o, i) => ({
      valor: String(i),
      etiqueta: o.etiqueta.trim() === '' ? `Opción ${String(i + 1)}` : o.etiqueta,
    })),
  ]
  return (
    <MarcoDelTipo
      hayCambios={JSON.stringify(v) !== JSON.stringify(inicial)}
      motivo={motivo}
      listo={listo}
      alEnviar={() => {
        alAplicar(pedidoDeLaVariante(v))
      }}
      alCancelar={alCancelar}
    >
      <OpcionesDeLaVariante
        uid={uid}
        opciones={v.opciones}
        alCambiar={(opciones) => {
          const porDefecto =
            v.porDefecto !== null && v.porDefecto < opciones.length ? v.porDefecto : null
          setV({ ...v, opciones, porDefecto })
        }}
      />
      <CampoSeleccion
        nombre={`${uid}-por-defecto`}
        etiqueta="Viene elegida"
        opciones={opcionesPorDefecto}
        value={v.porDefecto === null ? '' : String(v.porDefecto)}
        onChange={(e) => {
          setV({ ...v, porDefecto: e.target.value === '' ? null : Number(e.target.value) })
        }}
      />
      <EnPar
        uid={uid}
        v={v}
        alCambiar={(enPar) => {
          setV({ ...v, enPar })
        }}
      />
    </MarcoDelTipo>
  )
}
