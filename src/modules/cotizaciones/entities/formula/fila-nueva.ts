// El nombre (id) de una fila nueva de la fórmula: lo propone su etiqueta y no choca con nada de la fórmula. Lo usan insertar y duplicar una fila, una banda,
// un bucket y una opción de la variante nuevos; el id nunca se ve en la planilla. Puro.
import type { Formula } from '../formula'

export const MAXIMO_DE_LA_ETIQUETA = 60
// El tope de `esquemaId`: una letra y hasta 40 más.
const MAXIMO_DEL_ID = 41

// Lo que un nombre nuevo no puede ser: un nodo, una constante, un grupo, un bucket o la clave de un tipo de cambio (el compilador los prohíbe, `compilador-nombres.ts`).
export function ocupadosDe(formula: Formula): ReadonlySet<string> {
  const ocupados = new Set<string>()
  for (const n of formula.definicion.nodos) {
    ocupados.add(n.id)
    if (n.tipo === 'tipo_cambio') ocupados.add(n.clave)
  }
  for (const clave of Object.keys(formula.params.constantes)) ocupados.add(clave)
  for (const g of formula.definicion.grupos ?? []) ocupados.add(g.id)
  for (const bucket of Object.keys(formula.definicion.buckets ?? {})) ocupados.add(bucket)
  return ocupados
}

const sinGuionesEnLasPuntas = (texto: string) => texto.replace(/^_+|_+$/g, '')

// El id que propone la etiqueta: sin tildes, minúsculas ASCII, lo que no es letra ni dígito a `_` (sin repetir ni en las puntas); si empieza por un dígito o queda vacío, con el
// prefijo `fila_`; de hasta 41 caracteres; con `_2`, `_3`… si choca con algo de `ocupados`. Nunca lleva `__` (la reserva el compilador para las auxiliares).
export function idDeFilaNueva(etiqueta: string, ocupados: ReadonlySet<string>): string {
  const limpia = sinGuionesEnLasPuntas(
    etiqueta
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_'),
  )
  const base = sinGuionesEnLasPuntas(
    (limpia === '' || /^[0-9]/.test(limpia) ? `fila_${limpia}` : limpia).slice(0, MAXIMO_DEL_ID),
  )
  let candidato = base
  for (let n = 2; ocupados.has(candidato); n += 1) {
    const sufijo = `_${String(n)}`
    candidato = `${sinGuionesEnLasPuntas(base.slice(0, MAXIMO_DEL_ID - sufijo.length))}${sufijo}`
  }
  return candidato
}
