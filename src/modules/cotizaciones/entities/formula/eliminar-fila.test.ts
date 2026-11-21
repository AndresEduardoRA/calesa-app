import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import { eliminarFila } from './eliminar-fila'
import { FORMULA_A1 } from './hoja-a1.soporte'
import { duplicarFila } from './insertar-fila'
import type { ContextoDeUsos } from './usos-de-la-fila'

const SIN_NADA: ContextoDeUsos = { diseno: null, tarjeta: { nodos: [], grupos: [] } }
const ids = (f: Formula) => f.definicion.nodos.map((n) => n.id)

describe('eliminarFila', () => {
  it('una fila que otra usa no se borra', () => {
    expect(eliminarFila(FORMULA_A1, 2, SIN_NADA)).toEqual({
      ok: false,
      mensaje: 'La usan C5 y C7.',
    })
  })

  it('saca sus auxiliares y sus constantes', () => {
    const r = eliminarFila(FORMULA_A1, 6, SIN_NADA)
    if (!r.ok) throw new Error(r.mensaje)
    expect(ids(r.formula)).not.toContain('seguro')
    expect(ids(r.formula)).not.toContain('seguro__1')
    expect(r.formula.params.constantes).not.toHaveProperty('seguro__1')
    expect(r.formula.params.constantes['fees']).toBe(100)
  })

  it('saca la pct que absorbe su B', () => {
    const d = duplicarFila(FORMULA_A1, 5)
    if (!d.ok) throw new Error(d.mensaje)
    const r = eliminarFila(d.formula, 6, SIN_NADA)
    if (!r.ok) throw new Error(r.mensaje)
    expect(ids(r.formula)).toEqual(ids(FORMULA_A1))
    expect(r.formula.params.constantes).toEqual(FORMULA_A1.params.constantes)
  })

  it('lo que la tarjeta nombra no se borra', () => {
    expect(
      eliminarFila(FORMULA_A1, 6, { diseno: null, tarjeta: { nodos: ['seguro'], grupos: [] } }),
    ).toEqual({
      ok: false,
      mensaje: 'La usa la tarjeta: quítala en «Tarjeta» antes.',
    })
  })

  it('una fila que no existe', () => {
    expect(eliminarFila(FORMULA_A1, 40, SIN_NADA)).toEqual({
      ok: false,
      mensaje: 'Esa fila no existe.',
    })
  })
})
