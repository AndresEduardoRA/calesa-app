import { describe, expect, it } from 'vitest'
import { conElAjuste, formulaDePrueba, nodoDe, validaLaFormula } from './fila-de-prueba.soporte'
import { textoVigente } from './texto-vigente'
import { cambiarValorDeConstante } from './valor-en-la-planilla'

const formula = formulaDePrueba([
  { id: 'comision', texto: '=remate*4%', etiqueta: 'Comisión' },
  {
    id: 'par',
    texto: '=PORCENTAJE_DE(remate; 4%)',
    etiqueta: 'Par',
    extra: { sobrescribible: true },
  },
  { id: 'despacho', texto: '=900', etiqueta: 'Despacho' },
  { id: 'total', texto: '=comision+par+despacho', etiqueta: 'Total' },
])

const textoDe = (f: typeof formula, id: string) => {
  const n = nodoDe(f, id)
  return n !== undefined && 'texto' in n ? n.texto : undefined
}

describe('cambiarValorDeConstante: escribe params y reescribe el texto, como el ⚙', () => {
  it('la constante auxiliar de un porcentaje: `=remate*4%` pasa a `=remate*5%`', () => {
    const r = cambiarValorDeConstante(formula, 'comision__1', 0.05)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.formula.params.constantes['comision__1']).toBe(0.05)
    expect(textoDe(r.formula, 'comision')).toBe('=remate*5%')
    expect(textoVigente(r.formula, 'comision').estado).toBe('al_dia')
    expect(validaLaFormula(r.formula).ok).toBe(true)
  })

  it('es lo mismo que el ⚙ seguido de lo que reescribe guardar', () => {
    const r = cambiarValorDeConstante(formula, 'comision__1', 0.05)
    const delAjuste = textoVigente(conElAjuste(formula, 'comision__1', 0.05), 'comision')
    expect(delAjuste.estado).toBe('reescrito')
    if (!r.ok || delAjuste.estado !== 'reescrito') return
    expect(textoDe(r.formula, 'comision')).toBe(delAjuste.texto)
  })

  it('el % en B de un par escribe params[pct] y reescribe la raíz', () => {
    const r = cambiarValorDeConstante(formula, 'par__1', 0.125)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.formula.params.constantes['par__1']).toBe(0.125)
    expect(textoDe(r.formula, 'par')).toBe('=PORCENTAJE_DE(remate; 12.5%)')
  })

  it('una constante raíz con texto: `=900` pasa a `=950`', () => {
    const r = cambiarValorDeConstante(formula, 'despacho', 950)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.formula.params.constantes['despacho']).toBe(950)
    expect(textoDe(r.formula, 'despacho')).toBe('=950')
  })

  it('un negativo entra en params pero el texto queda: la fila dice que ya no manda', () => {
    const r = cambiarValorDeConstante(formula, 'despacho', -5)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.formula.params.constantes['despacho']).toBe(-5)
    expect(textoDe(r.formula, 'despacho')).toBe('=900')
    expect(textoVigente(r.formula, 'despacho')).toMatchObject({
      estado: 'no_manda',
      motivo: 'valor_no_escribible',
    })
  })

  it('el mismo valor devuelve la misma fórmula', () => {
    const r = cambiarValorDeConstante(formula, 'despacho', 900)
    expect(r).toEqual({ ok: true, formula })
    if (r.ok) expect(r.formula).toBe(formula)
  })
})

describe('cambiarValorDeConstante: lo que no entra no toca nada', () => {
  it('un nodo que no es una constante o no existe', () => {
    expect(cambiarValorDeConstante(formula, 'remate', 3).ok).toBe(false)
    expect(cambiarValorDeConstante(formula, 'no_esta', 3).ok).toBe(false)
  })

  it('un valor que no es finito', () => {
    expect(cambiarValorDeConstante(formula, 'despacho', Number.POSITIVE_INFINITY).ok).toBe(false)
    expect(cambiarValorDeConstante(formula, 'despacho', Number.NaN).ok).toBe(false)
  })

  it('no muta lo que recibe', () => {
    const antes = JSON.stringify(formula)
    cambiarValorDeConstante(formula, 'comision__1', 0.07)
    cambiarValorDeConstante(formula, 'despacho', -1)
    expect(JSON.stringify(formula)).toBe(antes)
  })
})
