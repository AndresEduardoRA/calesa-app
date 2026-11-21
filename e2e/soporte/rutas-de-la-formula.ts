import { expect, type Page } from '@playwright/test'
import { literal, sql } from './sql'

export type ParteDeLaFormulaEnE2e = 'planilla' | 'hoja' | 'tarjeta'

// La fórmula de trabajo del origen (la activa; si no hay, la más nueva sin archivar), leída por SQL como la lee la ruta corta. Un origen sin
// ninguna recibe «Fórmula», como la habría creado su primer guardado: el editor de una fórmula siempre tiene una (docs/UX.md › «Cotización:
// fórmulas del origen»).
export function formulaDeTrabajoDe(origenId: string): string {
  const id = sql(`select public._fdo_de_trabajo(${literal(origenId)}::uuid, true)`)
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error(`sin fórmula de trabajo en ${origenId}: ${id}`)
  return id
}

// `/configuracion/origenes/<origen>/formulas/<fórmula>/<parte><consulta>`, sin pasar por el 308 de la ruta corta.
export function urlDeLaFormula(
  origenId: string,
  parte: ParteDeLaFormulaEnE2e = 'planilla',
  consulta = '',
  formulaId = formulaDeTrabajoDe(origenId),
): string {
  return `/configuracion/origenes/${origenId}/formulas/${formulaId}/${parte}${consulta}`
}

// Abre esa parte del editor y espera la URL (con `?fila=` o `?lugar=`, que se borran al leerse, sólo el camino).
export async function abrirLaFormula(
  page: Page,
  origenId: string,
  parte: ParteDeLaFormulaEnE2e = 'planilla',
  consulta = '',
): Promise<string> {
  const formulaId = formulaDeTrabajoDe(origenId)
  await page.goto(urlDeLaFormula(origenId, parte, consulta, formulaId))
  await expect(page).toHaveURL(new RegExp(`/formulas/${formulaId}/${parte}`))
  return formulaId
}

// La URL del editor de alguna fórmula de ese origen, para `toHaveURL`.
export function enElEditor(origenId: string, parte: ParteDeLaFormulaEnE2e): RegExp {
  return new RegExp(`/configuracion/origenes/${origenId}/formulas/[0-9a-f-]{36}/${parte}(\\?|$)`)
}
