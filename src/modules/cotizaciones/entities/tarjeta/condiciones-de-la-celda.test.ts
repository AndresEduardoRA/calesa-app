import { describe, expect, it } from 'vitest'
import type { CalculoDeLaTarjeta } from '../calculo-de-la-tarjeta'
import type { CondicionDeLaTarjeta, ContenidoDeLaCelda } from '../cuadricula-de-la-tarjeta'
import { cumple, resolverElContenido, seCumplen } from './condiciones-de-la-celda'
import { tarjetaDesde, type TarjetaLista } from './lectura-de-la-tarjeta'
import { calculoDePrueba, CONTEXTO_DE_PRUEBA, crudaDeLaTarjeta } from './tarjeta.soporte'
import type { EntradaDelContenido } from './valor-del-dato'

const TARJETA = ((): TarjetaLista => {
  const l = tarjetaDesde(crudaDeLaTarjeta())
  if (l?.estado !== 'lista') throw new Error('la tarjeta de prueba no se lee')
  return l
})()

// El cálculo de prueba con la variante y una bandera en la versión (todo nodo de la versión tiene estado).
const calculo = (mas: Partial<CalculoDeLaTarjeta> = {}) => {
  const base = calculoDePrueba()
  return calculoDePrueba({
    valores: new Map([...base.valores, ['seguro', 1]]),
    estados: new Map([...(base.estados ?? []), ['variante', 'activo'], ['seguro', 'activo']]),
    ...mas,
  })
}

const entrada = (
  c: CalculoDeLaTarjeta = calculo(),
  contexto: Partial<EntradaDelContenido['contexto']> = {},
): EntradaDelContenido => ({
  tarjeta: TARJETA,
  calculo: c,
  contexto: { ...CONTEXTO_DE_PRUEBA, ...contexto },
  monedaBs: 'BOB',
  locale: 'es-BO',
})

const TITULO = { tipo: 'dato', variable: 'titulo' } as const
const DEL_VEHICULO = { tipo: 'dato', variable: 'vehiculo_titulo' } as const
const RESPALDO: ContenidoDeLaCelda = { tipo: 'respaldo', datos: [TITULO, DEL_VEHICULO] }

describe('cumple', () => {
  it('«está vacío» y «tiene valor» miran el dato como la lista de respaldo: un texto con sólo espacios está vacío', () => {
    const e = entrada()
    expect(cumple(e, { es: 'vacio', dato: TITULO })).toBe(true)
    expect(cumple(e, { es: 'no_vacio', dato: DEL_VEHICULO })).toBe(true)
    expect(cumple(entrada(calculo(), { titulo: '   ' }), { es: 'vacio', dato: TITULO })).toBe(true)
    const etiqueta = { tipo: 'dato', nodo: 'remate', mostrar: 'etiqueta' } as const
    expect(cumple(e, { es: 'no_vacio', dato: etiqueta })).toBe(true)
  })

  it('un nodo vale 0 si no aplica, su número si aplica y nulo sin valor; una comparación con nulo no se cumple', () => {
    const e = entrada()
    // fees está fuera de la variante: vale 0.
    expect(cumple(e, { es: 'cero', nodo: 'fees' })).toBe(true)
    expect(cumple(e, { es: 'no_cero', nodo: 'fees' })).toBe(false)
    expect(cumple(e, { es: 'mayor', nodo: 'remate', a: 999.5 })).toBe(true)
    expect(cumple(e, { es: 'menor', nodo: 'remate', a: 1000 })).toBe(false)
    expect(cumple(e, { es: 'igual', nodo: 'flete', a: 300 })).toBe(true)
    const sinValor = entrada(
      calculo({ valores: new Map([['remate', null]]), estados: new Map([['remate', 'activo']]) }),
    )
    expect(cumple(sinValor, { es: 'cero', nodo: 'remate' })).toBe(false)
    expect(cumple(sinValor, { es: 'no_cero', nodo: 'remate' })).toBe(false)
    expect(cumple(sinValor, { es: 'mayor', nodo: 'remate', a: -1 })).toBe(false)
    expect(cumple(sinValor, { es: 'menor', nodo: 'remate', a: 1 })).toBe(false)
  })

  it('la opción elegida de la variante y una bandera encendida o apagada (apagada también si no aplica)', () => {
    const e = entrada()
    expect(cumple(e, { es: 'opcion', nodo: 'variante', opcion: 'gasolina' })).toBe(true)
    expect(cumple(e, { es: 'opcion', nodo: 'variante', opcion: 'diesel' })).toBe(false)
    expect(cumple(e, { es: 'encendido', nodo: 'seguro' })).toBe(true)
    expect(cumple(e, { es: 'apagado', nodo: 'seguro' })).toBe(false)
    const apagada = entrada(calculo({ estados: new Map([['seguro', 'condicion_apagada']]) }))
    expect(cumple(apagada, { es: 'apagado', nodo: 'seguro' })).toBe(true)
    expect(cumple(apagada, { es: 'encendido', nodo: 'seguro' })).toBe(false)
  })

  it('un nodo que no está en la versión del cálculo deja la condición sin respuesta; el total siempre está', () => {
    const e = entrada()
    expect(cumple(e, { es: 'cero', nodo: 'ya_no_esta' })).toBeNull()
    expect(cumple(e, { es: 'apagado', nodo: 'ya_no_esta' })).toBeNull()
    const dato = { tipo: 'dato', nodo: 'ya_no_esta', mostrar: 'monto' } as const
    expect(cumple(e, { es: 'vacio', dato })).toBeNull()
    expect(
      cumple(entrada(calculo({ estados: new Map() })), { es: 'mayor', nodo: 'total', a: 1 }),
    ).toBe(true)
  })

  it('sin estados (el cálculo no trajo el primer recálculo) todo nodo aplica', () => {
    const e = entrada(calculo({ estados: null }))
    expect(cumple(e, { es: 'no_cero', nodo: 'fees' })).toBe(false)
    expect(cumple(e, { es: 'mayor', nodo: 'remate', a: 1 })).toBe(true)
  })
})

describe('seCumplen', () => {
  it('todas unidas con Y; una sin respuesta cuenta como que no', () => {
    const e = entrada()
    const si: CondicionDeLaTarjeta[] = [
      { es: 'mayor', nodo: 'remate', a: 1 },
      { es: 'opcion', nodo: 'variante', opcion: 'gasolina' },
    ]
    expect(seCumplen(e, si)).toBe(true)
    expect(seCumplen(e, [...si, { es: 'cero', nodo: 'remate' }])).toBe(false)
    expect(seCumplen(e, [...si, { es: 'cero', nodo: 'ya_no_esta' }])).toBe(false)
  })
})

describe('resolverElContenido', () => {
  it('la lista de respaldo da el primero de sus datos con valor: el título de la cotización o, sin él, el del vehículo', () => {
    expect(resolverElContenido(entrada(calculo(), { titulo: 'Para Juan' }), RESPALDO)).toEqual(
      TITULO,
    )
    expect(resolverElContenido(entrada(), RESPALDO)).toEqual(DEL_VEHICULO)
    expect(resolverElContenido(entrada(calculo(), { titulo: ' ' }), RESPALDO)).toEqual(DEL_VEHICULO)
  })

  it('sin ningún dato con valor la celda queda vacía; un número 0 tiene valor y un monto nulo no', () => {
    expect(resolverElContenido(entrada(calculo(), { vehiculo: null }), RESPALDO)).toEqual({
      tipo: 'vacio',
    })
    const cero = entrada(
      calculo({
        valores: new Map([
          ['remate', 0],
          ['flete', null],
        ]),
      }),
    )
    const monto = (nodo: string) => ({ tipo: 'dato', nodo, mostrar: 'monto' }) as const
    expect(
      resolverElContenido(cero, { tipo: 'respaldo', datos: [monto('flete'), monto('remate')] }),
    ).toEqual(monto('remate'))
    // Un nodo que no aplica no tiene valor; una descripción nula, tampoco.
    const descripcion = { tipo: 'dato', nodo: 'remate', mostrar: 'descripcion' } as const
    const sinDescripcion = { tipo: 'dato', nodo: 'garantia', mostrar: 'descripcion' } as const
    expect(
      resolverElContenido(entrada(), {
        tipo: 'respaldo',
        datos: [monto('fees'), sinDescripcion, descripcion, monto('ga')],
      }),
    ).toEqual(descripcion)
  })

  it('unas condiciones dan el contenido de la primera rama que se cumple o, si ninguna, el «si no»', () => {
    const c: ContenidoDeLaCelda = {
      tipo: 'condiciones',
      ramas: [
        { si: [{ es: 'cero', nodo: 'ya_no_esta' }], contenido: { tipo: 'texto', texto: 'nunca' } },
        { si: [{ es: 'mayor', nodo: 'remate', a: 5000 }], contenido: { tipo: 'vacio' } },
        {
          si: [{ es: 'opcion', nodo: 'variante', opcion: 'gasolina' }],
          contenido: { tipo: 'dato', nodo: 'remate', mostrar: 'monto' },
        },
      ],
      si_no: { tipo: 'texto', texto: 'Otra' },
    }
    expect(resolverElContenido(entrada(), c)).toEqual({
      tipo: 'dato',
      nodo: 'remate',
      mostrar: 'monto',
    })
    const diesel = entrada(calculo({ valores: new Map([['variante', 'diesel']]) }))
    expect(resolverElContenido(diesel, c)).toEqual({ tipo: 'texto', texto: 'Otra' })
  })

  it('lo demás queda igual', () => {
    const texto: ContenidoDeLaCelda = { tipo: 'texto', texto: 'Hola' }
    expect(resolverElContenido(entrada(), texto)).toBe(texto)
  })
})
