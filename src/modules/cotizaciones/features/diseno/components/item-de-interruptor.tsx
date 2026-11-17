'use client'

import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { EFECTOS_DE_INTERRUPTOR, type ItemDeDiseno } from '../../../entities/diseno'
import type { CambioDeAspectoDeItem } from '../../../entities/diseno/edicion-del-aspecto'
import type { FilaOrdenable } from '../hooks/use-fila-ordenable'
import { CamposDelAspectoDelItem, type ErrorDelAspecto } from './aspecto'
import { TituloConAsa } from './orden'

type Efecto = (typeof EFECTOS_DE_INTERRUPTOR)[number]

const EFECTO: Record<Efecto, { etiqueta: string; ayuda: string }> = {
  habilita: { etiqueta: 'Habilita', ayuda: 'Apagado, deshabilita lo que condiciona.' },
  muestra: { etiqueta: 'Muestra', ayuda: 'Apagado, no dibuja lo que condiciona.' },
}

type Props = {
  seccionId: string
  item: Extract<ItemDeDiseno, { tipo: 'interruptor' }>
  etiqueta: string
  ocupado: boolean
  fila: FilaOrdenable
  error: ErrorDelAspecto
  alPonerEfecto: (efecto: Efecto) => void
  alPonerAspecto: (cambios: CambioDeAspectoDeItem) => void
}

// Un interruptor de la hoja: una bandera de la fórmula que quien cotiza enciende o apaga. Aquí se elige qué hace apagada. Si el efecto no vale, lo dice el aviso del editor.
export function ItemDeInterruptor({
  seccionId,
  item,
  etiqueta,
  ocupado,
  fila: { alMontar, estilo, asa },
  error,
  alPonerEfecto,
  alPonerAspecto,
}: Props) {
  return (
    <li
      ref={alMontar}
      style={estilo}
      className="@container min-w-0 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) p-3"
      data-item={`interruptor:${item.nodo}`}
    >
      <TituloConAsa etiquetaDelAsa={`Mover «${etiqueta}»`} asa={asa}>
        <p className="text-(length:--text-sm) font-medium text-(--color-ink)">
          {`Interruptor ${etiqueta}.`}
        </p>
      </TituloConAsa>
      <CampoSeleccion
        nombre={`${seccionId}__${item.nodo}-efecto`}
        etiqueta="Qué hace"
        opciones={EFECTOS_DE_INTERRUPTOR.map((valor) => ({
          valor,
          etiqueta: EFECTO[valor].etiqueta,
        }))}
        value={item.efecto}
        disabled={ocupado}
        ayuda={EFECTO[item.efecto].ayuda}
        onChange={(evento) => {
          alPonerEfecto(evento.target.value as Efecto)
        }}
      />
      <CamposDelAspectoDelItem
        base={`${seccionId}__${item.nodo}`}
        item={item}
        ocupado={ocupado}
        error={error}
        alPoner={alPonerAspecto}
      />
    </li>
  )
}
