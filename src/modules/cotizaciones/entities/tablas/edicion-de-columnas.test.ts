import { describe, expect, it } from 'vitest'
import type { ColumnaDeTabla } from '../tabla-de-ayuda'
import {
  columnasParaEnviar,
  edicionDeLasColumnas,
  edicionDeUnaTablaNueva,
  editarColumnas,
  hayCambios,
  puedeQuitar,
  puedeSumar,
  resumenDeLosCambios,
  type AccionDeColumnas,
  type EdicionDeColumnas,
} from './edicion-de-columnas'
import { TOPE_DE_COLUMNAS } from './estructura'

const ORIGINALES: ColumnaDeTabla[] = [
  { clave: 'pais', etiqueta: 'País', tipo: 'texto' },
  { clave: 'monto', etiqueta: 'Monto', tipo: 'numero' },
  { clave: 'anio', etiqueta: 'Año', tipo: 'anio' },
]

const aplicar = (edicion: EdicionDeColumnas, ...acciones: AccionDeColumnas[]) =>
  acciones.reduce(editarColumnas, edicion)

const llaveDe = (edicion: EdicionDeColumnas, clave: string) =>
  edicion.columnas.find((c) => c.clave === clave)?.llave ?? ''

describe('una tabla nueva', () => {
  it('nace con una columna vacía de número', () => {
    expect(columnasParaEnviar(edicionDeUnaTablaNueva())).toEqual([
      { clave: 'columna', etiqueta: '', tipo: 'numero' },
    ])
  })

  it('la clave sigue a la etiqueta mientras no se toca, y después no', () => {
    const inicio = edicionDeUnaTablaNueva()
    const llave = inicio.columnas[0]?.llave ?? ''
    const escrita = aplicar(inicio, { tipo: 'escribir_etiqueta', llave, etiqueta: 'Monto USD' })
    expect(escrita.columnas[0]?.clave).toBe('monto_usd')
    const tocada = aplicar(
      escrita,
      { tipo: 'escribir_clave', llave, clave: 'usd' },
      { tipo: 'escribir_etiqueta', llave, etiqueta: 'Monto en dólares' },
    )
    expect(tocada.columnas[0]).toMatchObject({ clave: 'usd', etiqueta: 'Monto en dólares' })
  })

  it('la clave de una nueva no choca con otra de la tabla', () => {
    const inicio = edicionDeUnaTablaNueva()
    const primera = inicio.columnas[0]?.llave ?? ''
    const con = aplicar(
      inicio,
      { tipo: 'escribir_etiqueta', llave: primera, etiqueta: 'Monto' },
      { tipo: 'sumar' },
    )
    const segunda = con.columnas[1]?.llave ?? ''
    const fin = aplicar(con, { tipo: 'escribir_etiqueta', llave: segunda, etiqueta: 'Monto' })
    expect(columnasParaEnviar(fin).map((c) => c.clave)).toEqual(['monto', 'monto_2'])
  })

  it('no se quita la última columna; una nueva se quita del todo', () => {
    const inicio = edicionDeUnaTablaNueva()
    const llave = inicio.columnas[0]?.llave ?? ''
    expect(puedeQuitar(inicio)).toBe(false)
    expect(aplicar(inicio, { tipo: 'quitar', llave })).toBe(inicio)
    const dos = aplicar(inicio, { tipo: 'sumar' })
    expect(aplicar(dos, { tipo: 'quitar', llave }).columnas).toHaveLength(1)
  })

  it('suma hasta el tope de 20', () => {
    let edicion = edicionDeUnaTablaNueva()
    for (let i = 0; i < 30; i += 1) edicion = editarColumnas(edicion, { tipo: 'sumar' })
    expect(edicion.columnas).toHaveLength(TOPE_DE_COLUMNAS)
    expect(puedeSumar(edicion)).toBe(false)
  })

  it('elige el tipo', () => {
    const inicio = edicionDeUnaTablaNueva()
    const llave = inicio.columnas[0]?.llave ?? ''
    expect(
      aplicar(inicio, { tipo: 'elegir_tipo', llave, tipoDeColumna: 'anio' }).columnas[0]?.tipo,
    ).toBe('anio')
  })
})

describe('las columnas de una tabla que existe', () => {
  const inicio = edicionDeLasColumnas(ORIGINALES)

  it('sin tocar no hay cambios ni resumen', () => {
    expect(hayCambios(inicio, ORIGINALES)).toBe(false)
    expect(resumenDeLosCambios(inicio, ORIGINALES)).toBe('')
  })

  it('renombrar cambia la etiqueta y no la clave; la clave y el tipo de una existente no se cambian', () => {
    const llave = llaveDe(inicio, 'monto')
    const fin = aplicar(
      inicio,
      { tipo: 'escribir_etiqueta', llave, etiqueta: 'Monto USD' },
      { tipo: 'escribir_clave', llave, clave: 'otra' },
      { tipo: 'elegir_tipo', llave, tipoDeColumna: 'texto' },
    )
    expect(columnasParaEnviar(fin)[1]).toEqual({
      clave: 'monto',
      etiqueta: 'Monto USD',
      tipo: 'numero',
    })
    expect(resumenDeLosCambios(fin, ORIGINALES)).toBe('Se renombra 1')
  })

  it('quitar marca «Se quita» y no la manda; «No quitar» la devuelve', () => {
    const llave = llaveDe(inicio, 'anio')
    const quitada = aplicar(inicio, { tipo: 'quitar', llave })
    expect(quitada.columnas.find((c) => c.llave === llave)?.seQuita).toBe(true)
    expect(columnasParaEnviar(quitada).map((c) => c.clave)).toEqual(['pais', 'monto'])
    expect(resumenDeLosCambios(quitada, ORIGINALES)).toBe('Se quita 1')
    const devuelta = aplicar(quitada, { tipo: 'no_quitar', llave })
    expect(hayCambios(devuelta, ORIGINALES)).toBe(false)
  })

  it('mover cambia el orden; en los bordes no hace nada', () => {
    const llave = llaveDe(inicio, 'anio')
    const fin = aplicar(inicio, { tipo: 'mover', llave, hacia: -1 })
    expect(columnasParaEnviar(fin).map((c) => c.clave)).toEqual(['pais', 'anio', 'monto'])
    expect(resumenDeLosCambios(fin, ORIGINALES)).toBe('Cambia el orden')
    expect(aplicar(inicio, { tipo: 'mover', llave, hacia: 1 })).toBe(inicio)
  })

  it('el resumen junta todo', () => {
    const fin = aplicar(
      inicio,
      { tipo: 'sumar' },
      { tipo: 'sumar' },
      { tipo: 'quitar', llave: llaveDe(inicio, 'pais') },
    )
    expect(resumenDeLosCambios(fin, ORIGINALES)).toBe('Se suman 2 · se quita 1')
  })

  it('una nueva no toma la clave de una que se quita', () => {
    const quitada = aplicar(
      inicio,
      { tipo: 'quitar', llave: llaveDe(inicio, 'monto') },
      { tipo: 'sumar' },
    )
    const nueva = quitada.columnas.at(-1)?.llave ?? ''
    const fin = aplicar(quitada, { tipo: 'escribir_etiqueta', llave: nueva, etiqueta: 'Monto' })
    expect(fin.columnas.at(-1)?.clave).toBe('monto_2')
  })

  it('una etiqueta con espacios en los bordes es la misma', () => {
    const fin = aplicar(inicio, {
      tipo: 'escribir_etiqueta',
      llave: llaveDe(inicio, 'pais'),
      etiqueta: ' País ',
    })
    expect(hayCambios(fin, ORIGINALES)).toBe(false)
  })
})
