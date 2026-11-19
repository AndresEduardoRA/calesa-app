// Cambiar el valor de una constante desde la planilla de la fórmula (la celda C de una constante o la B del porcentaje de un `porcentaje_de`): escribe
// `params[id]` de la fórmula de trabajo, lo mismo que el ⚙, y el texto de la fila que la contiene (la raíz o una auxiliar) vuelve a decir el valor en su tramo
// (`textoVigente()` → `escribirLiteral()`). Si el texto no puede decirlo (un negativo, otra estructura) queda como está y la fila dice «el texto ya no manda», como
// tras un ⚙: recompilarla en la barra de fórmula pide «Pisar el valor». Editar un valor nunca pregunta. Puro, nunca lanza y no toca lo que recibe.
import type { Formula } from '../formula'
import { validarFormula } from '../validar'
import { filasDe } from './filas'
import { textoVigente } from './texto-vigente'

export type ValorCambiado = { ok: true; formula: Formula } | { ok: false; mensaje: string }

const NO_ES_CONSTANTE = 'Esa celda ya no es el valor de una constante de la fórmula.'
const SIN_NUMERO = 'Escribe un número, por ejemplo 1234,5.'

const planos = (f: Formula): Record<string, unknown> => ({
  ...f.params.constantes,
  tablas: f.params.tablas,
})

// La fórmula con la constante en su valor nuevo y, si se puede, el texto de su fila reescrito. Un rechazo de `validarFormula()` que nombra la constante no entra
// (la celda conserva el valor de antes y dice por qué); uno que ya estaba en otra fila no frena el cambio: lo dice su fila, como tras un «Aplicar».
export function cambiarValorDeConstante(
  formula: Formula,
  constanteId: string,
  valor: number,
): ValorCambiado {
  const nodo = formula.definicion.nodos.find((n) => n.id === constanteId)
  if (nodo?.tipo !== 'constante') return { ok: false, mensaje: NO_ES_CONSTANTE }
  if (!Number.isFinite(valor)) return { ok: false, mensaje: SIN_NUMERO }
  if (Object.is(formula.params.constantes[constanteId], valor)) return { ok: true, formula }

  const conElValor: Formula = {
    ...formula,
    params: {
      ...formula.params,
      constantes: { ...formula.params.constantes, [constanteId]: valor },
    },
  }
  const fila = filasDe(conElValor.definicion).find(
    (f) => f.nodo.id === constanteId || f.auxiliares.includes(constanteId),
  )
  const vigente = fila === undefined ? null : textoVigente(conElValor, fila.nodo.id)
  const candidata: Formula =
    fila === undefined || vigente?.estado !== 'reescrito'
      ? conElValor
      : {
          ...conElValor,
          definicion: {
            ...conElValor.definicion,
            nodos: conElValor.definicion.nodos.with(fila.posicion, {
              ...fila.nodo,
              texto: vigente.texto,
            } as typeof fila.nodo),
          },
        }

  const v = validarFormula(candidata.definicion, planos(candidata))
  if (!v.ok && (v.error.donde === constanteId || v.error.campo === `params.${constanteId}`)) {
    return { ok: false, mensaje: v.error.mensaje }
  }
  return { ok: true, formula: candidata }
}
