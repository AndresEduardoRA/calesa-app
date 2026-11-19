import { describe, expect, it } from 'vitest'
import { geometriaDeLaTarjeta, type CeldaDibujada, type Geometria } from './geometria-de-la-tarjeta'
import { tarjetaDesde, type LecturaDeLaTarjeta } from './lectura-de-la-tarjeta'
import { calculoDePrueba, CONTEXTO_DE_PRUEBA, crudaDeLaTarjeta } from './tarjeta.soporte'
import type { CalculoDeLaTarjeta } from '../calculo-de-la-tarjeta'

const LOCALE = 'es-BO'
const lectura = (mas: Record<string, unknown> = {}): LecturaDeLaTarjeta => {
  const l = tarjetaDesde(crudaDeLaTarjeta(mas))
  if (l === null) throw new Error('la tarjeta de prueba no se lee')
  return l
}
const geometria = (
  calculo: CalculoDeLaTarjeta = calculoDePrueba(),
  l = lectura(),
  monedaBs: string | null = 'BOB',
) =>
  geometriaDeLaTarjeta({
    lectura: l,
    calculo,
    contexto: CONTEXTO_DE_PRUEBA,
    monedaBs,
    locale: LOCALE,
  })
const celda = (g: Geometria, id: string): CeldaDibujada => {
  const c = g.celdas.find((x) => x.id === id)
  if (c === undefined) throw new Error(`sin la celda ${id}`)
  return c
}
const textoDe = (c: CeldaDibujada) =>
  c.contenido.tipo === 'texto' ? c.contenido.lineas.join('\n') : c.contenido.tipo

describe('geometriaDeLaTarjeta', () => {
  it('el ancho es la suma de las columnas y el alto, el de las filas visibles; cada celda con su rectángulo y su combinación', () => {
    const g = geometria()
    expect(g.ancho).toBe(490)
    // fees no aplica (sin estado): su fila no se dibuja (25 px menos).
    expect(g.alto).toBe(25 + 25 + 25 + 25 + 54 + 25 + 40)
    expect(celda(g, 'c_fecha')).toMatchObject({ x: 290, y: 0, ancho: 200, alto: 25 })
    expect(celda(g, 'c_flete')).toMatchObject({ x: 100, y: 75, ancho: 190, alto: 25 })
    expect(celda(g, 'c_nota')).toMatchObject({ x: 0, ancho: 490, alto: 40 })
  })

  it('una fila oculta acorta las celdas que la cruzan (aunque sea la del ancla) y dice por qué; sin filas visibles la celda no se dibuja', () => {
    const g = geometria()
    expect(celda(g, 'c_compra')).toMatchObject({ y: 50, alto: 25 })
    expect(g.celdas.some((c) => c.fila === 'n_fees')).toBe(false)
    expect(g.ocultas).toEqual([
      { fila: 'n_fees', etiqueta: 'Fees', delNodo: 'Fees', motivo: 'no_aplica' },
    ])
    const sinRemate = calculoDePrueba({
      estados: new Map([
        ['flete', 'activo'],
        ['fees', 'activo'],
        ['garantia', 'activo'],
      ]),
    })
    const conFeesCero = new Map(sinRemate.valores).set('fees', 0)
    const h = geometria({ ...sinRemate, valores: conFeesCero })
    expect(h.celdas.some((c) => c.id === 'c_compra' || c.id === 'c_compra_tc')).toBe(false)
    expect(h.ocultas.map((o) => `${o.fila}:${o.motivo}`)).toEqual([
      'n_remate:no_aplica',
      'n_fees:cero',
    ])
  })

  it('las filas que se dibujan, con su banda: una fila oculta no está y las de abajo suben', () => {
    const g = geometria()
    expect(g.filas.map((f) => f.id)).toEqual([
      'fecha',
      'asesor',
      'n_remate',
      'n_flete',
      'total',
      'a_garantia',
      'nota',
    ])
    expect(g.filas[3]).toEqual({ id: 'n_flete', y: 75, alto: 25 })
    const ultima = g.filas[g.filas.length - 1]
    expect(ultima === undefined ? 0 : ultima.y + ultima.alto).toBe(g.alto)
  })

  it('las celdas van en orden de lectura: fila por fila y, dentro, por columna', () => {
    const ids = geometria().celdas.map((c) => c.id)
    expect(ids.slice(0, 9)).toEqual([
      'c_titulo',
      'c_fecha',
      'c_asesor_rotulo',
      'c_asesor',
      'c_logo',
      'c_compra',
      'c_remate',
      'c_remate_monto',
      'c_compra_tc',
    ])
  })
})

describe('geometriaDeLaTarjeta: el contenido y el estilo', () => {
  it('resuelve las variables, los datos de un nodo, el porcentaje sin valor y el tipo de cambio del modo elegido', () => {
    const g = geometria()
    expect(textoDe(celda(g, 'c_titulo'))).toBe('COTIZACIÓN A GASOLINA')
    expect(textoDe(celda(g, 'c_asesor'))).toBe('Ana Pérez')
    expect(textoDe(celda(g, 'c_remate'))).toBe('Remate')
    expect(textoDe(celda(g, 'c_flete'))).toBe('Flete marítimo')
    expect(textoDe(celda(g, 'c_flete_pct'))).toBe('—')
    expect(textoDe(celda(g, 'c_compra_tc'))).toBe('Dólar oficial')
    expect(textoDe(celda(geometria(calculoDePrueba({ modoTc: 'bcb' })), 'c_compra_tc'))).toBe(
      'Dólar BCB',
    )
    expect(celda(g, 'c_logo').contenido).toEqual({ tipo: 'logo' })
  })

  it('el monto del total sale de los totales y, con «Ver total Bs», lleva la segunda línea en moneda local; un monto nulo es «—»', () => {
    const total = celda(geometria(calculoDePrueba({ verTotalBs: true })), 'c_total_monto')
    expect(total.contenido).toMatchObject({
      tipo: 'monto',
      valor: 1355,
      moneda: 'USD',
      segunda: { valor: 9430.8, moneda: 'BOB' },
    })
    expect(total.marca).toMatchObject({ nodo: 'total', mostrar: 'monto', total: true })
    expect(celda(geometria(), 'c_total_monto').contenido).toMatchObject({ segunda: null })
    expect(
      celda(geometria(calculoDePrueba({ verTotalBs: true }), lectura(), null), 'c_total_monto')
        .contenido,
    ).toMatchObject({ segunda: null })
    const sinFlete = calculoDePrueba()
    const valores = new Map(sinFlete.valores).set('flete', null)
    expect(textoDe(celda(geometria({ ...sinFlete, valores }), 'c_flete_monto'))).toBe('—')
  })

  it('un dato de un nodo que no aplica, en una fila que se dibuja, queda vacío', () => {
    const definicion = crudaDeLaTarjeta().definicion
    const filas = definicion.filas.map((f) =>
      f.id === 'n_flete' ? { id: 'n_flete', alto: 25, ocultar_si: 'nunca' } : f,
    )
    const calculo = calculoDePrueba()
    const g = geometria(
      { ...calculo, estados: new Map(calculo.estados).set('flete', 'fuera_de_variante') },
      lectura({ definicion: { ...definicion, filas } }),
    )
    expect(celda(g, 'c_flete').contenido).toEqual({ tipo: 'texto', lineas: [] })
    expect(celda(g, 'c_flete_monto').contenido).toEqual({ tipo: 'texto', lineas: [] })
    expect(celda(g, 'c_logistica').contenido).toEqual({ tipo: 'texto', lineas: ['Logística'] })
  })
})

describe('geometriaDeLaTarjeta: los colores y la de por omisión', () => {
  it('los colores: el hex del catálogo, `auto` (blanco) con el texto de más contraste, y un color que ya no está se dibuja `auto`', () => {
    const g = geometria()
    expect(celda(g, 'c_compra').estilo).toMatchObject({
      fondo: '#31869b',
      texto: '#ffffff',
      negrita: true,
      alinearVertical: 'arriba',
    })
    expect(celda(g, 'c_compra').marca.color).toBe('verde')
    expect(celda(g, 'c_flete').estilo).toMatchObject({ fondo: '#ffffff', texto: '#1b2130' })
    expect(celda(g, 'c_flete').marca.color).toBeUndefined()
    expect(celda(g, 'c_logistica').estilo.bordes).toEqual({
      arriba: 1,
      derecha: 1,
      abajo: 2,
      izquierda: 1,
    })
    expect(celda(g, 'c_nota').estilo).toMatchObject({
      tamano: 11,
      cursiva: true,
      alinear: 'izquierda',
      alinearVertical: 'centro',
    })
    expect(celda(g, 'c_nota').contenido).toEqual({
      tipo: 'texto',
      lineas: ['Precios sujetos a cambio.', 'No incluye reparación.'],
    })
  })

  it('no depende de lo que la hoja de quien mira trae de más: la portada compartida es la misma para todo nivel', () => {
    // Quien tiene un nivel mayor recibe valores y estados de nodos que la tarjeta no nombra (sólo nombra los del nivel «todos», K4 de
    // `cotizacion-tarjeta.sql`): la geometría no los lee.
    const base = calculoDePrueba()
    const deUnNivelMayor = calculoDePrueba({
      valores: new Map([...base.valores, ['costo_oculto', 777], ['margen', 0.3]]),
      estados: new Map([...(base.estados ?? []), ['costo_oculto', 'activo'], ['margen', 'activo']]),
    })
    expect(geometria(deUnNivelMayor)).toEqual(geometria(base))
  })

  it('sin plantilla o sin estados: la de por omisión, con el total', () => {
    for (const g of [
      geometria(calculoDePrueba(), { estado: 'sin_plantilla' }),
      geometria(calculoDePrueba({ estados: null })),
    ]) {
      expect(g.porOmision).toBe(true)
      expect(g.celdas.find((c) => c.marca.total)?.contenido).toMatchObject({
        tipo: 'monto',
        valor: 1355,
      })
      expect(g.celdas.map(textoDe)).toContain('Toyota Hilux 2022')
    }
    expect(geometria().porOmision).toBe(false)
  })
})
