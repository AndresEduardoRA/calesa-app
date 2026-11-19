// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { textoDelPdf } from '../../../../../../scripts/pdf/texto-del-pdf'
import { formatearMonto } from '@/shared/lib/formato'
import type { CalculoDeLaTarjeta } from '../../../entities/calculo-de-la-tarjeta'
import type { ContextoDeLaCotizacion } from '../../../entities/tarjeta/contexto-de-la-cotizacion'
import { geometriaDeLaTarjeta } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import {
  tarjetaDesde,
  type LecturaDeLaTarjeta,
} from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import {
  calculoDePrueba,
  CONTEXTO_DE_PRUEBA,
  crudaDeLaTarjeta,
} from '../../../entities/tarjeta/tarjeta.soporte'

vi.mock('server-only', () => ({}))

import { escalaDelPdf } from './documento-de-la-tarjeta'
import { VARIANTES_DE_LAS_FUENTES } from '../fuentes-de-la-tarjeta'
import { pdfDeLaTarjeta } from './pdf-de-la-tarjeta'

// El documento de la tarjeta (D15 de T310): la geometría de la tarjeta dibujada con el renderer real en una página A4 y leída con el lector de las pruebas.
const CONTEXTO: ContextoDeLaCotizacion = { ...CONTEXTO_DE_PRUEBA, logo: null }

const lecturaDe = (mas: Record<string, unknown> = {}): LecturaDeLaTarjeta => {
  const lectura = tarjetaDesde(crudaDeLaTarjeta(mas))
  if (lectura === null) {
    throw new Error('La tarjeta de prueba no cumple su esquema.')
  }
  return lectura
}

async function leer(
  entrada: { lectura?: LecturaDeLaTarjeta; calculo?: CalculoDeLaTarjeta; locale?: string } = {},
) {
  const geometria = geometriaDeLaTarjeta({
    lectura: entrada.lectura ?? lecturaDe(),
    calculo: entrada.calculo ?? calculoDePrueba(),
    contexto: CONTEXTO,
    monedaBs: 'BOB',
    locale: entrada.locale ?? 'es-BO',
  })
  const bytes = await pdfDeLaTarjeta({
    geometria,
    numero: 12,
    logo: null,
    empresa: 'Importadora Prueba',
  })
  const leido = textoDelPdf(bytes)
  return { bytes, leido, lineas: leido.paginas.flatMap((p) => p.lineas) }
}

const usd = (valor: number, locale = 'es-BO') => formatearMonto(valor, { moneda: 'USD', locale })
const contiene = (lineas: readonly string[], texto: string) => lineas.some((l) => l.includes(texto))

describe('pdfDeLaTarjeta: la tarjeta de una cotización en una página A4', () => {
  it('lleva los textos y montos de sus celdas, de arriba abajo, en una sola página', async () => {
    const { bytes, leido, lineas } = await leer()
    expect(new TextDecoder('latin1').decode(bytes.slice(0, 5))).toBe('%PDF-')
    expect(leido.paginas).toHaveLength(1)
    const orden = [
      'COTIZACIÓN A GASOLINA',
      'Ana Pérez',
      'Compra',
      usd(1000),
      'Flete marítimo',
      usd(300),
      'TOTAL DÓLARES',
      usd(1355),
      'GARANTÍA PARA LA PARTICIPACIÓN',
      'Precios sujetos a cambio.',
      'No incluye reparación.',
    ]
    const posiciones = orden.map((t) => lineas.findIndex((l) => l.includes(t)))
    expect(
      posiciones.every((p) => p >= 0),
      JSON.stringify(lineas),
    ).toBe(true)
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones)
    // Una fila que no aplica (fees, sin estado) no se dibuja.
    expect(contiene(lineas, 'Fees')).toBe(false)
  })

  it('los montos van con el locale de la empresa', async () => {
    const { lineas } = await leer({ locale: 'en-US' })
    expect(contiene(lineas, usd(1000, 'en-US'))).toBe(true)
    expect(usd(1000, 'en-US')).not.toBe(usd(1000))
  })

  it('cada celda lleva el hex de su color (y el blanco de `auto`)', async () => {
    const { leido } = await leer()
    for (const fondo of ['#31869b', '#fff7d6', '#ffffff']) {
      expect(leido.rellenos).toContain(fondo)
    }
  })

  it('el total en Bs va sólo con «Ver total Bs», con su moneda', async () => {
    const bs = formatearMonto(9430.8, { moneda: 'BOB', locale: 'es-BO' })
    expect(bs).toContain('Bs')
    expect((await leer()).lineas.filter((l) => l.includes('Bs'))).toEqual([])
    const { lineas } = await leer({ calculo: calculoDePrueba({ verTotalBs: true }) })
    expect(contiene(lineas, bs)).toBe(true)
  })

  it('el total impreso es el del cálculo, no la suma de las filas; un monto nulo es «—»', async () => {
    const calculo = calculoDePrueba({ totales: { usd: 1500, bs: null } })
    const valores = new Map(calculo.valores).set('flete', null)
    const { lineas } = await leer({ calculo: { ...calculo, valores } })
    expect(contiene(lineas, usd(1500))).toBe(true)
    expect(contiene(lineas, usd(1355))).toBe(false)
    expect(contiene(lineas, '—')).toBe(true)
  })

  it('sin plantilla, la tarjeta por omisión: el encabezado y «Total», sin grupos ni nota', async () => {
    const { lineas } = await leer({ lectura: { estado: 'sin_plantilla' } })
    expect(contiene(lineas, 'Total')).toBe(true)
    expect(contiene(lineas, usd(1355))).toBe(true)
    expect(contiene(lineas, 'Toyota Hilux 2022')).toBe(true)
    for (const fuera of ['Compra', 'Precios sujetos a cambio.']) {
      expect(contiene(lineas, fuera)).toBe(false)
    }
  })

  it('sin logo no hay imágenes; los metadatos no nombran al cliente, al asesor ni al vehículo', async () => {
    const { bytes, leido } = await leer()
    expect(leido.imagenes).toBe(0)
    const crudo = new TextDecoder('latin1').decode(bytes)
    const utf16 = (s: string) =>
      [...s].map((c) => c.charCodeAt(0).toString(16).padStart(4, '0')).join('')
    for (const nombre of ['Ana Pérez', 'Toyota Hilux']) {
      expect(crudo.includes(nombre)).toBe(false)
      expect(crudo.toLowerCase().includes(utf16(nombre))).toBe(false)
    }
    expect(crudo).toMatch(/\/Author\b/)
    expect(crudo).not.toMatch(/\/Subject\b|\/Keywords\b/)
  })
})

describe('pdfDeLaTarjeta: la escala y las fuentes', () => {
  it('escala al menor factor que hace entrar la tarjeta en el ancho y el alto útiles, y nunca agranda', () => {
    const g = (ancho: number, alto: number) => ({
      ancho,
      alto,
      porOmision: false,
      celdas: [],
      filas: [],
      ocultas: [],
    })
    expect(escalaDelPdf(g(600, 400))).toBe(1)
    // 1600 px = 1200 pt en 523,28 pt de ancho útil.
    expect(escalaDelPdf(g(1600, 400))).toBeCloseTo(523.28 / 1200, 5)
    // Una tarjeta muy alta escala por el alto.
    expect(escalaDelPdf(g(600, 4000))).toBeCloseTo(769.89 / 3000, 5)
  })

  it('registra Geist recta e itálica, en 400 y 600', () => {
    expect(
      VARIANTES_DE_LAS_FUENTES.map((v) => `${v.archivo}:${String(v.peso)}:${String(v.italica)}`),
    ).toEqual([
      'Geist-Regular.ttf:400:false',
      'Geist-SemiBold.ttf:600:false',
      'Geist-Italic.ttf:400:true',
      'Geist-SemiBoldItalic.ttf:600:true',
    ])
  })

  it('la nota en cursiva sale con la Geist itálica embebida', async () => {
    const { bytes } = await leer()
    const crudo = new TextDecoder('latin1').decode(bytes)
    expect(crudo).toMatch(/Geist-Italic/)
  })
})
