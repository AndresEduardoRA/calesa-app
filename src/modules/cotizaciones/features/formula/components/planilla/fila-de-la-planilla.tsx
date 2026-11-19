'use client'

import { TriangleAlertIcon } from 'lucide-react'
import { memo } from 'react'
import type { ErrorDeFilaNueva, PedidoDeFilaNueva } from '../../../../entities/formula/fila-nueva'
import type { ValorCambiado } from '../../../../entities/formula/valor-en-la-planilla'
import type { CifraDeLaFila } from '../../../../entities/formula/vista-previa'
import type { Formato } from '../../../../entities/nodos'
import type { FilaParaDibujar } from '../../hooks/use-editor-de-la-formula.soporte'
import { SumarFila } from '../editor/sumar-fila'
import { CeldaDeLaConstante } from './celda-de-la-constante'
import {
  CeldaDeLaUnidad,
  type AccionesDeLaUnidad,
  type ValorDeLaUnidad,
} from './celda-de-la-unidad'
import { CeldaDelValor } from './celda-del-valor'
import { CELDA, COLUMNAS, CONCEPTO, DE_DONDE_SALE, NUMERO, PORCENTAJE, VALOR } from './clases'
import { ValorDeConstante } from '../editor/valor-de-constante'

// La celda B de un `porcentaje_de`: su `pct`, editable si es una constante.
export type CeldaB = {
  pct: string
  editable: boolean
  valor: number | null
  formato: Formato | undefined
}

export type FilaDeLaPlanillaProps = {
  numero: number
  fila: FilaParaDibujar
  elegida: boolean
  deDondeSale: string
  // La cifra de la fila con la unidad de ejemplo; `leyendo`: los tipos de cambio y las tablas todavía no llegaron.
  cifra: CifraDeLaFila
  leyendo: boolean
  b: CeldaB | null
  // El valor de una constante (en `params`): su celda C se edita.
  constante: number | null | undefined
  // Lo de la unidad de ejemplo (un `input`, un dato del vehículo, una bandera o la variante): su celda C se edita.
  unidad: ValorDeLaUnidad | undefined
  // Las celdas de la fórmula esperan (texto sin aplicar, un grupo abierto, la fila nueva, un guardado): el motivo es uno para toda la tabla.
  bloqueada: boolean
  idDelMotivo: string
  // El rechazo de `validarFormula()` que nombra la fila.
  rechazo: string | null
  // «Sumar fila debajo» abierto bajo esta fila, con el error del último intento.
  sumando: { error: ErrorDeFilaNueva | null } | null
  ocupados: ReadonlySet<string>
  alCrear: (pedido: Omit<PedidoDeFilaNueva, 'despuesDe'>) => void
  alCancelarSumar: () => void
  alElegir: (id: string) => void
  alCambiarValor: (id: string, valor: number) => ValorCambiado
  acciones: AccionesDeLaUnidad
}

function ValorDeLaFila(p: FilaDeLaPlanillaProps) {
  if (p.unidad !== undefined) {
    return (
      <CeldaDeLaUnidad
        nodo={p.fila.nodo}
        valor={p.unidad}
        acciones={p.acciones}
        idDelMotivo={p.idDelMotivo}
      />
    )
  }
  if (p.constante !== undefined) {
    return (
      <CeldaDeLaConstante
        nodo={p.fila.id}
        concepto={p.fila.etiqueta}
        valor={p.constante}
        formato={p.fila.nodo.formato}
        bloqueada={p.bloqueada}
        idDelMotivo={p.idDelMotivo}
        alCambiar={p.alCambiarValor}
      />
    )
  }
  return <CeldaDelValor cifra={p.cifra} leyendo={p.leyendo} />
}

function PorcentajeDeLaFila({ b, ...p }: FilaDeLaPlanillaProps & { b: CeldaB }) {
  if (b.editable) {
    return (
      <CeldaDeLaConstante
        nodo={b.pct}
        concepto={`Porcentaje de ${p.fila.etiqueta}`}
        valor={b.valor}
        formato={b.formato ?? 'pct'}
        bloqueada={p.bloqueada}
        idDelMotivo={p.idDelMotivo}
        alCambiar={p.alCambiarValor}
      />
    )
  }
  return b.valor === null ? (
    <span className="text-(--color-ink-soft)">—</span>
  ) : (
    <ValorDeConstante valor={b.valor} formato={b.formato ?? 'pct'} />
  )
}

// Una fila de la planilla: el número (sólo para leer), A (el concepto y su id, que elige la fila para la barra de fórmula), B, C y D. Debajo, si los hay, el rechazo
// que la nombra y el formulario de «Sumar fila debajo». `memo` con callbacks estables: la planilla dibuja hasta 500.
export const FilaDeLaPlanilla = memo(function FilaDeLaPlanilla(p: FilaDeLaPlanillaProps) {
  const { fila, elegida, rechazo } = p
  return (
    <>
      <tr
        data-fila={fila.id}
        {...(elegida ? { 'data-elegida': '' } : {})}
        {...(rechazo === null ? {} : { 'data-rechazo': '' })}
        className="group/fila"
      >
        <td className={NUMERO}>{p.numero}</td>
        <th
          scope="row"
          className={`${CONCEPTO} group-data-elegida/fila:font-semibold group-data-elegida/fila:shadow-[inset_4px_0_0_var(--color-primario-ink)]`}
        >
          <button
            type="button"
            aria-pressed={elegida}
            aria-label={`Elegir ${fila.etiqueta}`}
            className="min-h-[44px] w-full rounded-sm text-left break-words outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-(--color-primario-ink) md:pointer-fine:min-h-8"
            onClick={() => {
              p.alElegir(fila.id)
            }}
          >
            {fila.etiqueta}{' '}
            <code className="text-(length:--text-xs) break-all text-(--color-ink-soft)">
              {fila.id}
            </code>
          </button>
          {rechazo === null ? null : (
            <span className="inline-flex items-center gap-1 text-(--color-aviso-ink)">
              <TriangleAlertIcon aria-hidden className="size-4" />
              <span className="sr-only">Esta fila tiene un problema</span>
            </span>
          )}
        </th>
        <td className={PORCENTAJE}>
          {p.b === null ? null : <PorcentajeDeLaFila {...p} b={p.b} />}
        </td>
        <td className={VALOR}>
          <ValorDeLaFila {...p} />
        </td>
        <td className={DE_DONDE_SALE}>{p.deDondeSale}</td>
      </tr>
      {rechazo === null ? null : (
        <tr>
          <td
            colSpan={COLUMNAS}
            role="alert"
            className={`${CELDA} bg-(--color-aviso-soft) text-(--color-aviso-ink)`}
          >
            {rechazo}
          </td>
        </tr>
      )}
      {p.sumando === null ? null : (
        <tr>
          <td colSpan={COLUMNAS} className={CELDA}>
            <SumarFila
              ocupados={p.ocupados}
              error={p.sumando.error}
              alCrear={p.alCrear}
              alCancelar={p.alCancelarSumar}
            />
          </td>
        </tr>
      )}
    </>
  )
})
