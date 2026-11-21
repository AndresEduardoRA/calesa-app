import 'server-only'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import {
  leerLaFormulaDelOrigen,
  type FormulaAbierta,
  type FormulaDelOrigen,
} from '@/modules/cotizaciones'
import { datosO } from '@/shared/lib/errores'
import { abrirOrigen, type OrigenAbierto } from '../../../abrir-origen'

export type FormulaAbiertaEnLaRuta =
  | Exclude<OrigenAbierto, { tipo: 'abierto' }>
  | (Extract<OrigenAbierto, { tipo: 'abierto' }> & {
      // La fila con sus piezas de hoy y la activa del origen: la cabeza del editor.
      abierta: FormulaAbierta
      // Lo que reciben la planilla, la hoja y la tarjeta (lo que mandan sus escrituras).
      formula: FormulaDelOrigen
      archivada: boolean
    })

// Lo que comprueban el layout del editor de una fórmula y cada una de sus páginas (un layout no protege a su página): el origen y la pestaña «Fórmulas»
// (`abrirOrigen()`), y la fórmula por su id **en ese origen** (`leerLaFormulaDelOrigen()`, la policy vuelve a decidir). Un id que no es de este origen, no existe
// o no se ve es el 404. Una lectura que falla sube al `error.tsx`. Una vez por request: la comparten el layout y la página.
export const abrirFormula = cache(
  async (origenId: string, formulaId: string): Promise<FormulaAbiertaEnLaRuta> => {
    const abierto = await abrirOrigen(origenId, 'formulas')
    if (abierto.tipo !== 'abierto') {
      return abierto
    }
    const abierta = datosO(await leerLaFormulaDelOrigen(abierto.origen.id, formulaId))
    if (abierta === null) {
      notFound()
    }
    const { id, nombre, activa, actualizadoEn, archivadaEn } = abierta.formula
    return {
      ...abierto,
      abierta,
      formula: { id, nombre, activa, actualizadoEn },
      archivada: archivadaEn !== null,
    }
  },
)
