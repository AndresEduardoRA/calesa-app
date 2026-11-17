'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { MAXIMO_DE_ATAJOS, type ItemDeDiseno } from '../../../entities/diseno'
import type { CambioDeAspectoDeItem } from '../../../entities/diseno/edicion-del-aspecto'
import type { FilaOrdenable } from '../hooks/use-fila-ordenable'
import { CamposDelAspectoDelItem, type ErrorDelAspecto } from './aspecto'
import { TituloConAsa } from './orden'

type Atajos = Extract<ItemDeDiseno, { tipo: 'atajos' }>

type Props = {
  seccionId: string
  item: Atajos
  etiqueta: string
  // Las columnas que la base permite para estos atajos (la actual siempre va).
  columnas: readonly string[]
  ocupado: boolean
  fila: FilaOrdenable
  error: ErrorDelAspecto
  alPonerAtajos: (cambios: { columna?: string; filas?: number }) => void
  alPonerAspecto: (cambios: CambioDeAspectoDeItem) => void
}

// Atajos: chips con las primeras filas de la tabla de un nodo que ponen su valor en la celda. Se elige la columna y cuántos chips.
export function ItemDeAtajos({
  seccionId,
  item,
  etiqueta,
  columnas,
  ocupado,
  fila: { alMontar, estilo, asa },
  error,
  alPonerAtajos,
  alPonerAspecto,
}: Props) {
  const base = `${seccionId}__${item.nodo}-atajos`
  return (
    <li
      ref={alMontar}
      style={estilo}
      className="@container min-w-0 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) p-3"
      data-item={`atajos:${item.nodo}`}
    >
      <TituloConAsa etiquetaDelAsa={`Mover los atajos de «${etiqueta}»`} asa={asa}>
        <p className="text-(length:--text-sm) font-medium text-(--color-ink)">
          {`Atajos de ${etiqueta}.`}
        </p>
      </TituloConAsa>
      <div className="grid min-w-0 gap-2 @md:grid-cols-2">
        <CampoSeleccion
          nombre={`${base}-columna`}
          etiqueta="Columna de los chips"
          opciones={columnas.map((valor) => ({ valor, etiqueta: valor }))}
          value={item.columna}
          disabled={ocupado}
          onChange={(evento) => {
            alPonerAtajos({ columna: evento.target.value })
          }}
        />
        <Campo
          nombre={`${base}-filas`}
          etiqueta={`Cuántos chips (1 a ${String(MAXIMO_DE_ATAJOS)})`}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAXIMO_DE_ATAJOS}
          value={item.filas}
          disabled={ocupado}
          ayuda="Chips con las primeras filas de la tabla; ponen su valor en la celda."
          onChange={(evento) => {
            alPonerAtajos({ filas: evento.target.valueAsNumber })
          }}
        />
      </div>
      <CamposDelAspectoDelItem
        base={base}
        item={item}
        ocupado={ocupado}
        error={error}
        alPoner={alPonerAspecto}
      />
    </li>
  )
}
