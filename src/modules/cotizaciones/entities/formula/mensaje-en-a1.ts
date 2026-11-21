// Un mensaje de `validarFormula()` con la hoja: cada «id» de una fila pasa a «C5 (Remate)» (o «B9 (% de Agencia)»), como los del compilador (D5). Lo que no es una
// celda de la hoja queda como vino. Puro.
import type { HojaDeLaPlanilla } from './hoja-de-la-planilla'
import { nombrarConLaHoja } from './referencias-a1'

export function mensajeEnA1(mensaje: string, hoja: HojaDeLaPlanilla): string {
  const nombrar = nombrarConLaHoja(hoja)
  return mensaje.replace(/«([a-z][a-z0-9_]*)»/g, (todo, id: string) => {
    const nombre = nombrar(id)
    return nombre === undefined ? todo : `${nombre.celda} (${nombre.etiqueta})`
  })
}
