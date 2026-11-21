import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { ponerEnBanda } from './bandas'
import { FORMULA_BANDAS, reglaQueFalla } from './bandas.soporte'
import { compilarFilaBase } from './compilar-fila-base'
import { sumasDeBandaAlDia } from './sumas-de-banda'

// FORMULA_BANDAS con Tres (3, sin banda) tras Dos y «Subtotal A» (`SUMA(ga)*2`, sin banda) al final: Grupo A es Cinco (5) y Uno (1).
function conSubtotal(): Formula {
  const nodos = FORMULA_BANDAS.definicion.nodos.flatMap((n) =>
    n.id === 'dos' ? [n, { id: 'tres', tipo: 'constante', etiqueta: 'Tres' } as Nodo] : [n],
  )
  const base: Formula = {
    definicion: { ...FORMULA_BANDAS.definicion, nodos },
    params: {
      ...FORMULA_BANDAS.params,
      constantes: { ...FORMULA_BANDAS.params.constantes, tres: 3 },
    },
  }
  const r = compilarFilaBase(base, {
    destino: { id: 'sub_a', etiqueta: 'Subtotal A', despuesDe: 'bandera' },
    texto: 'SUMA(ga)*2',
  })
  if (!r.ok) throw new Error(JSON.stringify(r.error))
  return r.formula
}
const F = conSubtotal()
const nodo = (f: Formula, id: string) => f.definicion.nodos.find((n) => n.id === id)
// Lo que vale «Subtotal A»: la suma de su banda (constantes) por el número de su texto.
const subtotal = (f: Formula) => {
  const de = (n: Nodo | undefined) => (n !== undefined && 'de' in n ? n.de : [])
  const delTexto = f.definicion.nodos.filter((n) => n.id.startsWith('sub_a__'))
  const suma = delTexto.find((n) => 'op' in n && n.op === 'suma')
  const por = delTexto.find((n) => n.tipo === 'constante')
  const valor = (id: string) => f.params.constantes[id] ?? 0
  return de(suma).reduce((t, id) => t + valor(id), 0) * valor(por?.id ?? '')
}
const enBanda = (f: Formula, id: string, grupo: string | null) => {
  const r = ponerEnBanda(f, id, grupo)
  if (!r.ok) throw new Error(r.mensaje)
  return r.formula
}

describe('sumasDeBandaAlDia', () => {
  it('sin bandas que cambien, devuelve la misma fórmula', () => {
    const r = sumasDeBandaAlDia(F, F)
    expect(r.ok && r.formula).toBe(F)
  })

  it('una fila que entra a la banda entra a la suma que la nombra, y la que sale, sale', () => {
    expect(subtotal(F)).toBe(12)
    const conTres = enBanda(F, 'tres', 'ga')
    // Sin ponerla al día, la suma sigue con la lista de cuando se compiló.
    expect(subtotal(conTres)).toBe(12)
    const r = sumasDeBandaAlDia(F, conTres)
    if (!r.ok) throw new Error(r.mensaje)
    expect(subtotal(r.formula)).toBe(18)
    expect(reglaQueFalla(r.formula)).toBeNull()
    const sinUno = sumasDeBandaAlDia(r.formula, enBanda(r.formula, 'uno', null))
    if (!sinUno.ok) throw new Error(sinUno.mensaje)
    expect(subtotal(sinUno.formula)).toBe(16)
  })

  it('un valor ajustado con ⚙ en la fila no se pisa: se compila el texto reescrito', () => {
    const aux = F.definicion.nodos.find((n) => n.id.startsWith('sub_a__') && n.tipo === 'constante')
    if (aux === undefined) throw new Error('sin la constante del texto')
    const ajustada: Formula = {
      ...F,
      params: { ...F.params, constantes: { ...F.params.constantes, [aux.id]: 3 } },
    }
    const r = sumasDeBandaAlDia(ajustada, enBanda(ajustada, 'tres', 'ga'))
    if (!r.ok) throw new Error(r.mensaje)
    expect(subtotal(r.formula)).toBe(27)
    const sub = nodo(r.formula, 'sub_a')
    expect(sub !== undefined && 'texto' in sub ? sub.texto : null).toBe('SUMA(ga)*3')
  })

  it('si el texto ya no manda o una fila de la banda quedaría debajo, no entra y dice por qué', () => {
    const aux = F.definicion.nodos.find((n) => n.id.startsWith('sub_a__') && n.tipo === 'constante')
    if (aux === undefined) throw new Error('sin la constante del texto')
    const noManda: Formula = {
      ...F,
      params: { ...F.params, constantes: { ...F.params.constantes, [aux.id]: -3 } },
    }
    const r = sumasDeBandaAlDia(noManda, enBanda(noManda, 'tres', 'ga'))
    expect(r.ok ? '' : r.mensaje).toBe(
      'C10 suma la banda «Grupo A» y su texto ya no manda: escríbelo otra vez antes.',
    )
    const abajo: Formula = {
      ...F,
      definicion: {
        ...F.definicion,
        nodos: [
          ...F.definicion.nodos,
          { id: 'tarde', tipo: 'constante', etiqueta: 'Tarde' } as Nodo,
        ],
      },
      params: { ...F.params, constantes: { ...F.params.constantes, tarde: 4 } },
    }
    const debajo = sumasDeBandaAlDia(abajo, enBanda(abajo, 'tarde', 'ga'))
    expect(debajo.ok ? '' : debajo.mensaje).toBe(
      'C10 suma la banda «Grupo A»: una fila de la banda quedaría debajo de ella.',
    )
  })
})
