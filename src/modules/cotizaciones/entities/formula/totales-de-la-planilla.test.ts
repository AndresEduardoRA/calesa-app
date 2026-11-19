import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import { validarFormula } from '../validar'
import { contextoDeDondeSale } from './de-donde-sale'
import type { TerrenoDePrueba } from './terreno-de-prueba'
import { totalesDeLaUnidad } from './totales-de-la-planilla'
import { calcularLaVistaPrevia } from './vista-previa'

const terreno: TerrenoDePrueba = {
  tipos_cambio: { oficial: 2, paralelo: 4 },
  monedas: { oficial: 'BOB', paralelo: 'BOB' },
  tablas: {},
  avisos: [],
}

function validada(definicion: unknown, params: Record<string, unknown>): Formula {
  const v = validarFormula(definicion, params)
  if (!v.ok) throw new Error(v.error.mensaje)
  return v.formula
}

// Con grupos: «Lado de afuera» y «Gastos» al paralelo, «Impuestos» al oficial; la base imponible y la garantía aparte, con su interruptor.
const conGrupos = validada(
  {
    nodos: [
      {
        id: 'tc_oficial',
        tipo: 'tipo_cambio',
        clave: 'oficial',
        etiqueta: 'TC oficial',
        formato: 'raw',
      },
      {
        id: 'tc_paralelo',
        tipo: 'tipo_cambio',
        clave: 'paralelo',
        etiqueta: 'TC paralelo',
        formato: 'raw',
      },
      { id: 'garantia_on', tipo: 'bandera', etiqueta: 'Con garantía' },
      { id: 'remate', tipo: 'input', etiqueta: 'Remate', formato: 'usd', grupo: 'afuera' },
      {
        id: 'gastos',
        tipo: 'constante',
        etiqueta: 'Gastos fijos',
        formato: 'usd',
        grupo: 'gastos',
      },
      {
        id: 'impuestos',
        tipo: 'constante',
        etiqueta: 'Impuestos',
        formato: 'usd',
        grupo: 'aduana',
      },
      {
        id: 'cif',
        tipo: 'calculo',
        op: 'suma',
        etiqueta: 'CIF',
        de: ['remate', 'gastos'],
        formato: 'usd',
        salida: 'base_imponible',
      },
      {
        id: 'garantia',
        tipo: 'constante',
        etiqueta: 'Garantía',
        formato: 'usd',
        salida: 'aparte',
        condicion: 'garantia_on',
      },
      {
        id: 'total',
        tipo: 'calculo',
        op: 'suma',
        etiqueta: 'Total',
        de: ['remate', 'gastos', 'impuestos'],
        formato: 'usd',
        salida: 'total',
      },
    ],
    buckets: { afuera: 'tc_paralelo', aduana: 'tc_oficial' },
    total_en: 'tc_paralelo',
    grupos: [
      { id: 'afuera', etiqueta: 'Lado de afuera', tono: 'verde', bucket: 'afuera' },
      { id: 'gastos', etiqueta: 'Gastos', tono: 'verde', bucket: 'afuera' },
      { id: 'aduana', etiqueta: 'Impuestos', tono: 'verde', bucket: 'aduana' },
    ],
  },
  { gastos: 100, impuestos: 50, garantia: 300 },
)

const calcular = (
  formula: Formula,
  unidad = {},
  modo?: Parameters<typeof calcularLaVistaPrevia>[3],
) => {
  const vista = calcularLaVistaPrevia(
    formula,
    terreno,
    { inputs: {}, banderas: {}, vehiculo: {}, ...unidad },
    modo,
  )
  if (vista.tipo !== 'calculada') throw new Error(vista.tipo)
  return totalesDeLaUnidad(formula, vista, modo, contextoDeDondeSale(formula, 'es-BO'))
}

describe('totalesDeLaUnidad con grupos', () => {
  it('los dos totales, la base imponible y lo aparte, en el orden de V1 y con su cómo sale', () => {
    const lineas = calcular(conGrupos, {
      inputs: { remate: 1000 },
      banderas: { garantia_on: true },
    })
    expect(lineas).toEqual([
      {
        tipo: 'monto',
        titulo: 'Total en dólares',
        // (1000 + 100) × 4 + 50 × 2 = 4500, ÷ 4.
        valor: 1125,
        moneda: 'USD',
        comoSale: 'total en BOB ÷ TC paralelo',
      },
      {
        tipo: 'monto',
        titulo: 'Total en BOB',
        valor: 4500,
        moneda: 'BOB',
        comoSale: '(Lado de afuera + Gastos) × TC paralelo + Impuestos × TC oficial',
      },
      {
        tipo: 'monto',
        titulo: 'Base imponible (CIF)',
        valor: 1100,
        moneda: 'USD',
        comoSale: 'Remate + Gastos fijos',
      },
      {
        tipo: 'monto',
        titulo: 'Garantía (aparte)',
        valor: 300,
        moneda: 'USD',
        comoSale: 'monto fijo',
      },
    ])
  })

  it('lo aparte con su interruptor apagado dice por qué, no suma cero', () => {
    const garantia = calcular(conGrupos).at(-1)
    expect(garantia).toEqual({
      tipo: 'apagada',
      titulo: 'Garantía (aparte)',
      motivo: 'Apagada: falta encender «Con garantía».',
      comoSale: 'monto fijo',
    })
  })

  it('con un modo, el tipo de cambio de cada bucket y el que divide son los del modo', () => {
    const [usd, local] = calcular(
      conGrupos,
      { inputs: { remate: 1000 } },
      { buckets: { afuera: 'tc_oficial', aduana: 'tc_oficial' }, total_en: 'tc_oficial' },
    )
    expect(usd).toMatchObject({ valor: 1150, comoSale: 'total en BOB ÷ TC oficial' })
    expect(local).toMatchObject({
      valor: 2300,
      comoSale: '(Lado de afuera + Gastos + Impuestos) × TC oficial',
    })
  })
})

// El total suma términos con bucket (la forma de `subasta_usa`); uno queda fuera de la variante.
const sinGrupos = validada(
  {
    nodos: [
      { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC oficial', formato: 'raw' },
      {
        id: 'tp',
        tipo: 'tipo_cambio',
        clave: 'paralelo',
        etiqueta: 'TC paralelo',
        formato: 'raw',
      },
      {
        id: 'via',
        tipo: 'opcion',
        etiqueta: 'Vía',
        por_defecto: 'a',
        opciones: [
          { clave: 'a', etiqueta: 'A', titulo: 'A' },
          { clave: 'b', etiqueta: 'B', titulo: 'B' },
        ],
      },
      { id: 'afuera', tipo: 'input', etiqueta: 'Afuera', formato: 'usd', bucket: 'x' },
      { id: 'aduana', tipo: 'constante', etiqueta: 'Aduana', formato: 'usd', bucket: 'y' },
      {
        id: 'solo_b',
        tipo: 'constante',
        etiqueta: 'Sólo B',
        formato: 'usd',
        bucket: 'x',
        solo_en: ['b'],
      },
      {
        id: 'total',
        tipo: 'calculo',
        op: 'suma',
        etiqueta: 'Total',
        de: ['afuera', 'aduana', 'solo_b'],
        formato: 'usd',
        salida: 'total',
      },
    ],
    buckets: { x: 'tp', y: 'tc' },
  },
  { aduana: 10, solo_b: 7 },
)

describe('totalesDeLaUnidad sin grupos', () => {
  it('sin total_en el dólar es la suma, dicha como el total; la local reparte por bucket sin lo que está fuera de la variante', () => {
    const [usd, local] = calcular(sinGrupos, { inputs: { afuera: 100 } })
    expect(usd).toEqual({
      tipo: 'monto',
      titulo: 'Total en dólares',
      valor: 110,
      moneda: 'USD',
      comoSale: 'Afuera + Aduana + Sólo B',
    })
    expect(local).toMatchObject({
      valor: 420,
      comoSale: 'Afuera × TC paralelo + Aduana × TC oficial',
    })
  })

  it('con la otra variante el término vuelve a contar', () => {
    const [, local] = calcular(sinGrupos, { inputs: { afuera: 100 }, variante: 'b' })
    expect(local).toMatchObject({
      valor: 448,
      comoSale: '(Afuera + Sólo B) × TC paralelo + Aduana × TC oficial',
    })
  })

  it('el total con bucket propio se dice solo', () => {
    const conBucket = validada(
      {
        nodos: [
          {
            id: 'tp',
            tipo: 'tipo_cambio',
            clave: 'paralelo',
            etiqueta: 'TC paralelo',
            formato: 'raw',
          },
          { id: 'k', tipo: 'constante', etiqueta: 'K', formato: 'usd' },
          {
            id: 'total',
            tipo: 'calculo',
            op: 'suma',
            etiqueta: 'Total',
            de: ['k'],
            formato: 'usd',
            salida: 'total',
            bucket: 'x',
          },
        ],
        buckets: { x: 'tp' },
      },
      { k: 3 },
    )
    const [, local] = calcular(conBucket)
    expect(local).toMatchObject({ valor: 12, comoSale: 'Total × TC paralelo' })
  })
})
