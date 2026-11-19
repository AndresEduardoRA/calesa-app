import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import { validarFormula } from '../validar'
import type { TerrenoDePrueba } from './terreno-de-prueba'
import { calcularLaVistaPrevia } from './vista-previa'

// Dos tipos de cambio (oficial y paralelo, en monedas distintas para ver cuál nombra los Bs), un input, una bandera con su condición y la variante.
function formulaConModos(): Formula {
  const definicion = {
    nodos: [
      { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC', formato: 'raw' },
      { id: 'tp', tipo: 'tipo_cambio', clave: 'paralelo', etiqueta: 'TP', formato: 'raw' },
      {
        id: 'v',
        tipo: 'opcion',
        etiqueta: 'Variante',
        por_defecto: 'a',
        opciones: [
          { clave: 'a', etiqueta: 'A', titulo: 'Opción A' },
          { clave: 'b', etiqueta: 'B', titulo: 'Opción B' },
        ],
      },
      { id: 'valor', tipo: 'input', etiqueta: 'Valor', formato: 'usd' },
      { id: 'extra', tipo: 'bandera', etiqueta: 'Extra' },
      { id: 'kb', tipo: 'constante', etiqueta: 'KB', formato: 'usd', solo_en: ['b'] },
      { id: 'ke', tipo: 'constante', etiqueta: 'KE', formato: 'usd', condicion: 'extra' },
      {
        id: 'total',
        tipo: 'calculo',
        op: 'suma',
        etiqueta: 'Total',
        de: ['valor', 'kb', 'ke'],
        salida: 'total',
        formato: 'usd',
        bucket: 'afuera',
      },
    ],
    buckets: { afuera: 'tc' },
    total_en: 'tc',
  }
  const v = validarFormula(definicion, { kb: 10, ke: 5 })
  if (!v.ok) throw new Error(v.error.mensaje)
  return v.formula
}

const conDosCambios: TerrenoDePrueba = {
  tipos_cambio: { oficial: 2, paralelo: 4 },
  monedas: { oficial: 'BOB', paralelo: 'PEN' },
  tablas: {},
  avisos: [],
}

describe('calcularLaVistaPrevia con la unidad de ejemplo y el modo', () => {
  it('lo tipeado, las banderas y la variante de la unidad llegan al motor', () => {
    const v = calcularLaVistaPrevia(formulaConModos(), conDosCambios, {
      inputs: { valor: 100 },
      banderas: { extra: true },
      vehiculo: {},
      variante: 'b',
    })
    expect(v.tipo).toBe('calculada')
    if (v.tipo !== 'calculada') return
    expect(v.valores.get('total')).toBe(115)
    expect(v.valores.get('v')).toBe('b')
    expect(v.totales).toEqual({ usd: 115, bs: 230, monedaBs: 'BOB' })
  })

  it('sin unidad son las cifras de prueba: datos en 0, banderas apagadas, la variante por defecto', () => {
    const v = calcularLaVistaPrevia(formulaConModos(), conDosCambios)
    expect(v.tipo).toBe('calculada')
    if (v.tipo !== 'calculada') return
    expect(v.valores.get('total')).toBe(0)
    expect(v.estados.get('kb')).toBe('fuera_de_variante')
    expect(v.estados.get('ke')).toBe('condicion_apagada')
  })

  it('lo que la fórmula ya no tiene se suelta en vez de hacer lanzar al motor', () => {
    const v = calcularLaVistaPrevia(formulaConModos(), conDosCambios, {
      inputs: { valor: 1, borrada: 9, extra: 3 },
      banderas: { valor: true, ya_no: true },
      vehiculo: { anio: 2020 },
      variante: 'z',
    })
    expect(v.tipo).toBe('calculada')
    if (v.tipo !== 'calculada') return
    expect(v.valores.get('total')).toBe(1)
    expect(v.valores.get('v')).toBe('a')
  })
})

describe('calcularLaVistaPrevia con el modo elegido', () => {
  it('el modo elige el tipo de cambio de cada bucket y el de `total_en`, y nombra la moneda de los Bs', () => {
    const v = calcularLaVistaPrevia(
      formulaConModos(),
      conDosCambios,
      { inputs: { valor: 100 }, banderas: {}, vehiculo: {} },
      { buckets: { afuera: 'tp' }, total_en: 'tp' },
    )
    expect(v.tipo).toBe('calculada')
    if (v.tipo !== 'calculada') return
    expect(v.totales).toEqual({ usd: 100, bs: 400, monedaBs: 'PEN' })
  })
})

describe('calcularLaVistaPrevia con el modo', () => {
  it('un modo que no cubre un bucket da no_calcula y no lanza', () => {
    expect(
      calcularLaVistaPrevia(formulaConModos(), conDosCambios, undefined, {
        buckets: { otro: 'tp' },
        total_en: 'tp',
      }),
    ).toEqual({ tipo: 'no_calcula' })
  })

  it('con grupos dice el subtotal de cada uno en su orden', () => {
    const definicion = {
      nodos: [
        { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC', formato: 'raw' },
        { id: 'a', tipo: 'input', etiqueta: 'A', formato: 'usd', grupo: 'g1' },
        { id: 'b', tipo: 'constante', etiqueta: 'B', formato: 'usd', grupo: 'g2' },
        {
          id: 'total',
          tipo: 'calculo',
          op: 'suma',
          etiqueta: 'Total',
          de: ['a', 'b'],
          salida: 'total',
          formato: 'usd',
        },
      ],
      buckets: { afuera: 'tc' },
      total_en: 'tc',
      grupos: [
        { id: 'g1', etiqueta: 'Uno', tono: 'verde', bucket: 'afuera' },
        { id: 'g2', etiqueta: 'Dos', tono: 'verde', bucket: 'afuera' },
      ],
    }
    const f = validarFormula(definicion, { b: 5 })
    if (!f.ok) throw new Error(f.error.mensaje)
    const v = calcularLaVistaPrevia(f.formula, conDosCambios, {
      inputs: { a: 10 },
      banderas: {},
      vehiculo: {},
    })
    expect(v.tipo).toBe('calculada')
    if (v.tipo !== 'calculada') return
    expect([...v.grupos]).toEqual([
      ['g1', { usd: 10, bs: 20, seDibuja: true }],
      ['g2', { usd: 5, bs: 10, seDibuja: true }],
    ])
  })
})
