'use client'

import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoSinResultados } from '@/shared/ui/estados'
import type { BandaDeLaPlanilla as Banda } from '../../../../entities/formula/planilla'
import type { FilaParaDibujar } from '../../hooks/use-editor-de-la-formula.soporte'
import { BuscarFila } from '../editor/buscar-fila'
import { BandaDeLaPlanilla, type ContextoDeLasBandas } from './banda-de-la-planilla'
import type { ContextoDeLasFilas } from './contexto-de-las-filas'

type Props = {
  nombreDelOrigen: string
  bandas: readonly Banda<FilaParaDibujar>[]
  ctx: ContextoDeLasFilas
  deLasBandas: ContextoDeLasBandas
  busqueda: string
  alBuscar: (busqueda: string) => void
  sinCoincidencias: boolean
  hayMas: boolean
}

const CABECERA =
  'border-b border-(--color-line-strong) px-2 py-2 text-left text-(length:--text-xs) font-semibold text-(--color-ink-soft)'

// La tabla de la planilla de la fórmula: «Buscar fila» y una `<table>` nativa con las cuatro columnas de V1 (A · concepto, B · %, C · valor, D · de dónde sale) y una
// banda por `<tbody>`. Va en su marco, que se desplaza de costado (en el celular y con el texto al 200 %) con # y A pegadas: la página nunca se ensancha. Hasta
// `TOPE_DE_LO_CARGADO` filas, con el aviso del tope y «Buscar fila» como camino a las demás.
export function TablaDeLaPlanilla(p: Props) {
  return (
    <div className="grid min-w-0 gap-2">
      <BuscarFila valor={p.busqueda} alCambiar={p.alBuscar} />
      <div className="@container/planilla relative min-w-0 overflow-x-auto rounded-(--radius-lg) border border-(--color-line)">
        <table className="w-full min-w-[46rem] border-collapse bg-(--color-surface) text-(length:--text-sm)">
          <caption className="sr-only">Filas de la fórmula de {p.nombreDelOrigen}</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className={`${CABECERA} sticky left-0 z-10 w-10 bg-(--color-surface) text-right`}
              >
                <span aria-hidden>#</span>
                <span className="sr-only">Número</span>
              </th>
              <th
                scope="col"
                className={`${CABECERA} sticky left-10 z-10 border-r bg-(--color-surface)`}
              >
                A · concepto
              </th>
              <th scope="col" className={`${CABECERA} text-right`}>
                B · %
              </th>
              <th scope="col" className={`${CABECERA} text-right`}>
                C · valor
              </th>
              <th scope="col" className={CABECERA}>
                D · de dónde sale
              </th>
            </tr>
          </thead>
          {p.bandas.map((banda) => (
            <BandaDeLaPlanilla
              key={banda.tipo === 'grupo' ? `grupo:${banda.grupo.id}` : banda.tipo}
              banda={banda}
              ctx={p.ctx}
              bandas={p.deLasBandas}
            />
          ))}
        </table>
      </div>
      {p.sinCoincidencias ? (
        <EstadoSinResultados
          descripcion={`Ninguna fila tiene «${p.busqueda.trim()}» en el nombre ni en la etiqueta.`}
        />
      ) : null}
      {p.hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_LO_CARGADO, { orden: 'primeras filas', articulo: 'las' })}
          camino="Busca una fila por su nombre o su etiqueta."
        />
      ) : null}
    </div>
  )
}
