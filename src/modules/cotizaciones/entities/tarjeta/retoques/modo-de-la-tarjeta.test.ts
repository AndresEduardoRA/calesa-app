import { describe, expect, it } from 'vitest'
import { geometriaDeLaTarjeta } from '../geometria-de-la-tarjeta'
import { tarjetaDesde } from '../lectura-de-la-tarjeta'
import { calculoDePrueba, CONTEXTO_DE_PRUEBA, crudaDeLaTarjeta } from '../tarjeta.soporte'
import {
  filaEnY,
  filasDelModo,
  lugarDelCampo,
  MOTIVO_CON_CAMBIOS,
  MOTIVO_SIN_TEXTOS,
  motivoDeLaCeldaSinTexto,
  motivoDelTextoLargo,
  motivoParaNoRetocar,
  nombreDeLaCelda,
  textoDelAvisoDeNoAplican,
} from './modo-de-la-tarjeta'
import { CUADRICULA_DE_RETOQUES } from './retoques.soporte'

const lectura = tarjetaDesde(crudaDeLaTarjeta())
if (lectura === null) throw new Error('la tarjeta de prueba no se lee')
const geometria = geometriaDeLaTarjeta({
  lectura,
  calculo: calculoDePrueba(),
  contexto: CONTEXTO_DE_PRUEBA,
  monedaBs: 'BOB',
  locale: 'es-BO',
})

describe('filasDelModo', () => {
  it('las filas que se dibujan, con su banda, su rótulo (el primer texto) y si el borrador las oculta', () => {
    const filas = filasDelModo(geometria, new Set(['asesor']))
    // n_fees no aplica en el cálculo de prueba: no se dibuja y no tiene control.
    expect(filas.map((f) => f.id)).toEqual([
      'fecha',
      'asesor',
      'n_remate',
      'n_flete',
      'total',
      'a_garantia',
      'nota',
    ])
    expect(filas[1]).toMatchObject({ id: 'asesor', y: 25, alto: 25, oculta: true })
    expect(filas[1]?.rotulo).toBe('Asesor:')
    expect(filas.find((f) => f.id === 'total')?.rotulo).toBe('TOTAL DÓLARES')
    expect(filas.every((f, i) => f.oculta === (i === 1))).toBe(true)
  })

  it('una fila sin textos se nombra por su número', () => {
    const vacia = {
      ...geometria,
      celdas: [],
      filas: [
        { id: 'f', y: 0, alto: 20 },
        { id: 'g', y: 20, alto: 20 },
      ],
    }
    expect(filasDelModo(vacia, new Set()).map((f) => f.rotulo)).toEqual(['Fila 1', 'Fila 2'])
  })
})

describe('filaEnY', () => {
  it('la fila cuya banda contiene la y; fuera de todas, nula', () => {
    const filas = filasDelModo(geometria, new Set())
    expect(filaEnY(filas, 0)?.id).toBe('fecha')
    expect(filaEnY(filas, 24.9)?.id).toBe('fecha')
    expect(filaEnY(filas, 25)?.id).toBe('asesor')
    expect(filaEnY(filas, -1)).toBeNull()
    expect(filaEnY(filas, geometria.alto)).toBeNull()
  })
})

describe('lugarDelCampo', () => {
  it('en la celda con la tarjeta casi a su tamaño, una celda ancha y la letra normal', () => {
    expect(lugarDelCampo({ escala: 1, anchoDeLaCelda: 200, fuenteRaiz: 16 })).toBe('en_la_celda')
    expect(lugarDelCampo({ escala: 0.8, anchoDeLaCelda: 200, fuenteRaiz: 16 })).toBe('en_la_celda')
  })

  it('a lo ancho del modal con la tarjeta chica, una celda angosta o la letra al 200 %', () => {
    expect(lugarDelCampo({ escala: 0.6, anchoDeLaCelda: 400, fuenteRaiz: 16 })).toBe(
      'ancho_del_modal',
    )
    expect(lugarDelCampo({ escala: 1, anchoDeLaCelda: 150, fuenteRaiz: 16 })).toBe(
      'ancho_del_modal',
    )
    expect(lugarDelCampo({ escala: 1, anchoDeLaCelda: 400, fuenteRaiz: 32 })).toBe(
      'ancho_del_modal',
    )
  })
})

describe('textoDelAvisoDeNoAplican', () => {
  it('singular, plural y nada', () => {
    expect(textoDelAvisoDeNoAplican(1)).toBe('1 retoque ya no aplica: se quitará al guardar.')
    expect(textoDelAvisoDeNoAplican(2)).toBe('2 retoques ya no aplican: se quitarán al guardar.')
    expect(textoDelAvisoDeNoAplican(0)).toBeNull()
  })
})

describe('los motivos del modo', () => {
  it('«Retocar» apagado: la tarjeta por omisión primero, después los cambios de la hoja', () => {
    expect(motivoParaNoRetocar({ porOmision: true, cambiosSinGuardar: true })).toBe(
      MOTIVO_SIN_TEXTOS,
    )
    expect(motivoParaNoRetocar({ porOmision: false, cambiosSinGuardar: true })).toBe(
      MOTIVO_CON_CAMBIOS,
    )
    expect(motivoParaNoRetocar({ porOmision: false, cambiosSinGuardar: false })).toBeNull()
  })

  it('una celda se nombra por su texto de la plantilla (cortado a 30) o por su id', () => {
    expect(nombreDeLaCelda(CUADRICULA_DE_RETOQUES, 'c_saludo')).toBe('Hola')
    const larga = {
      ...CUADRICULA_DE_RETOQUES,
      celdas: [
        {
          ...CUADRICULA_DE_RETOQUES.celdas[0]!,
          contenido: { tipo: 'texto' as const, texto: 'x'.repeat(40) },
        },
      ],
    }
    expect(nombreDeLaCelda(larga, 'c_saludo')).toBe(`${'x'.repeat(30)}…`)
    expect(nombreDeLaCelda(CUADRICULA_DE_RETOQUES, 'c_monto')).toBe('c_monto')
    expect(nombreDeLaCelda(null, 'c_saludo')).toBe('c_saludo')
    expect(motivoDelTextoLargo('Hola')).toBe(
      'Acorta el texto de la celda «Hola»: tiene más de 300 caracteres.',
    )
  })

  it('una celda sin texto: la de un dato lo dice; el logo o una vacía, que no tiene texto', () => {
    expect(motivoDeLaCeldaSinTexto('dato')).toBe(
      'Esta celda muestra un dato de la cotización: no se retoca.',
    )
    expect(motivoDeLaCeldaSinTexto('logo')).toBe('Esta celda no tiene texto para retocar.')
  })
})
