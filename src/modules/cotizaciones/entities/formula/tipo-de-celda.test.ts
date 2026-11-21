import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { validarFormula } from '../validar'
import { conNodoAntes, FORMULA_A1, filaNueva } from './hoja-a1.soporte'
import { paramsParaValidar } from './params-para-validar'
import { cambiarTipo, motivoDelTipo, tipoDeCelda, TIPOS_DE_CELDA } from './tipo-de-celda'

// FORMULA_A1 válida: Remate en «Primer pago» y el total en el TC oficial (fila 1). Una fila 9 «Fila nueva» (valor fijo 0) al final.
const VALIDA: Formula = conNodoAntes(
  {
    ...FORMULA_A1,
    definicion: {
      ...FORMULA_A1.definicion,
      total_en: 'tc',
      nodos: FORMULA_A1.definicion.nodos.map((n) =>
        n.id === 'remate' ? { ...n, grupo: 'primer_pago' } : n,
      ),
    },
    params: { ...FORMULA_A1.params, constantes: { ...FORMULA_A1.params.constantes, x: 0 } },
  },
  filaNueva('x'),
  null,
)
const nodo = (f: Formula, id: string) => f.definicion.nodos.find((n) => n.id === id)
const valida = (f: Formula) => validarFormula(f.definicion, paramsParaValidar(f)).ok
const cambiar = (...a: Parameters<typeof cambiarTipo>) => {
  const r = cambiarTipo(...a)
  if (!r.ok) throw new Error(r.mensaje)
  return r.formula
}

describe('tipoDeCelda', () => {
  it('cada tipo de nodo se ve como un tipo de celda; tabla y tramo, igual', () => {
    const tipos = [
      'constante',
      'calculo',
      'input',
      'campo_vehiculo',
      'tipo_cambio',
      'bandera',
      'tabla',
      'tramo',
      'opcion',
    ]
    expect(tipos.map((tipo) => tipoDeCelda({ tipo } as Nodo))).toEqual([
      'valor_fijo',
      'calculo',
      'lo_escribe_el_asesor',
      'dato_del_vehiculo',
      'tipo_de_cambio',
      'interruptor',
      'de_una_tabla',
      'de_una_tabla',
      'variante',
    ])
    expect(TIPOS_DE_CELDA).toHaveLength(8)
  })
})

describe('cambiarTipo', () => {
  it('la fórmula de prueba vale', () => {
    expect(valida(VALIDA)).toBe(true)
  })

  it('de valor fijo a «Lo escribe el asesor»: conserva id, etiqueta, formato y banda; suelta el valor', () => {
    const f = cambiar(VALIDA, 3, { tipo: 'lo_escribe_el_asesor' })
    expect(nodo(f, 'fees')).toEqual({ id: 'fees', etiqueta: 'Fees', tipo: 'input', formato: 'usd' })
    expect(f.params.constantes).not.toHaveProperty('fees')
    const conBanda = cambiar(VALIDA, 2, { tipo: 'valor_fijo', valor: 900 })
    expect(nodo(conBanda, 'remate')).toMatchObject({ tipo: 'constante', grupo: 'primer_pago' })
    expect(conBanda.params.constantes['remate']).toBe(900)
    expect(valida(conBanda)).toBe(true)
  })

  it('un cálculo con auxiliares: se van con su texto, y sus constantes', () => {
    const f = cambiar(VALIDA, 6, { tipo: 'valor_fijo', valor: 7 })
    expect(nodo(f, 'seguro__1')).toBeUndefined()
    expect(f.params.constantes).not.toHaveProperty('seguro__1')
    expect(nodo(f, 'seguro')).toEqual({ id: 'seguro', etiqueta: 'Seguro', tipo: 'constante' })
  })

  it('la fila nueva pasa a tipo de cambio, interruptor o variante', () => {
    expect(nodo(cambiar(VALIDA, 9, { tipo: 'tipo_de_cambio', clave: 'paralelo' }), 'x')).toEqual({
      id: 'x',
      etiqueta: 'Fila nueva',
      tipo: 'tipo_cambio',
      clave: 'paralelo',
      formato: 'raw',
    })
    expect(nodo(cambiar(VALIDA, 9, { tipo: 'interruptor' }), 'x')).toMatchObject({
      tipo: 'bandera',
    })
    const opciones = [
      { clave: 'a', etiqueta: 'A', titulo: 'A' },
      { clave: 'b', etiqueta: 'B', titulo: 'B' },
    ]
    const f = cambiar(VALIDA, 9, { tipo: 'variante', opciones, porDefecto: 'a' })
    expect(nodo(f, 'x')).toMatchObject({ tipo: 'opcion', por_defecto: 'a', opciones })
    expect(
      nodo(cambiar(VALIDA, 9, { tipo: 'dato_del_vehiculo', campo: 'anio' }), 'x'),
    ).toMatchObject({
      tipo: 'campo_vehiculo',
      campo: 'anio',
    })
  })

  it('lo que deja la fórmula inválida no entra, y el motivo nombra celdas', () => {
    const r = cambiarTipo(VALIDA, 9, { tipo: 'tipo_de_cambio', clave: 'oficial' })
    expect(r).toEqual({
      ok: false,
      mensaje: 'C1 (TC oficial) y C9 (Fila nueva) son el mismo tipo de cambio («oficial»).',
    })
    expect(cambiarTipo(VALIDA, 8, { tipo: 'interruptor' })).toEqual({
      ok: false,
      mensaje:
        'El total C8 (Total) tiene que dar un monto: un input, una constante, una tabla, un tramo o un cálculo.',
    })
  })

  it('un rechazo que ya estaba no frena el cambio', () => {
    expect(valida(FORMULA_A1)).toBe(false)
    expect(cambiarTipo(FORMULA_A1, 3, { tipo: 'lo_escribe_el_asesor' }).ok).toBe(true)
  })
})

describe('motivoDelTipo', () => {
  it('una sola variante; un tipo de cambio en uso sigue siéndolo', () => {
    const variante = {
      id: 'via',
      tipo: 'opcion',
      etiqueta: 'Vía',
      opciones: [
        { clave: 'a', etiqueta: 'A', titulo: 'A' },
        { clave: 'b', etiqueta: 'B', titulo: 'B' },
      ],
    } as Nodo
    const conVariante = conNodoAntes(VALIDA, variante, 'remate')
    expect(motivoDelTipo(conVariante, 10, 'variante')).toBe(
      'Esta fórmula ya tiene una variante (C2).',
    )
    expect(motivoDelTipo(conVariante, 2, 'variante')).toBeNull()
    expect(cambiarTipo(VALIDA, 1, { tipo: 'valor_fijo', valor: 1 })).toEqual({
      ok: false,
      mensaje:
        'Es el tipo de cambio de una banda o del total: cámbialo en «Total y tipos de cambio» antes.',
    })
    expect(motivoDelTipo(VALIDA, 40, 'interruptor')).toBe('Esa fila no existe.')
  })
})
