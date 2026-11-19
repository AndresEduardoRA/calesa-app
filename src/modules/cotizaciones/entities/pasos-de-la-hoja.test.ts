import { describe, expect, it } from 'vitest'
import { respuestaDePrueba } from './hoja-de-prueba.soporte'
import { faltaUnDato, pasosDeLaHoja } from './pasos-de-la-hoja'

const VEHICULO = { panel: 'vehiculo', elegido: false, obligatorio: true }
const CLIENTE = { panel: 'cliente', elegido: true, obligatorio: true }

describe('pasosDeLaHoja', () => {
  it('los cuatro, en el orden de V1, con el panel que abre cada uno', () => {
    const pasos = pasosDeLaHoja({
      faltaUnDato: false,
      vehiculo: VEHICULO,
      cliente: CLIENTE,
      vistaPrevia: 'vista-previa',
    })
    expect(pasos.map((p) => [p.etiqueta, p.panel])).toEqual([
      ['Hoja', null],
      ['Vehículo', 'vehiculo'],
      ['Cliente', 'cliente'],
      ['Vista previa', 'vista-previa'],
    ])
  })

  it('el punto: elegido; obligatorio que falta; nada si falta y es opcional; «Vista previa» nunca', () => {
    const pasos = pasosDeLaHoja({
      faltaUnDato: false,
      vehiculo: VEHICULO,
      cliente: CLIENTE,
      vistaPrevia: 'vista-previa',
    })
    expect(pasos.map((p) => [p.punto, p.textoDelPunto, p.title])).toEqual([
      [null, null, 'Hoja'],
      ['obligatorio_que_falta', 'obligatorio que falta', 'Vehículo: obligatorio que falta'],
      ['elegido', 'elegido', 'Cliente: elegido'],
      [null, null, 'Vista previa'],
    ])
    const opcional = pasosDeLaHoja({
      faltaUnDato: false,
      vehiculo: { ...VEHICULO, obligatorio: false },
      cliente: null,
      vistaPrevia: null,
    })
    expect(opcional[1]?.punto).toBeNull()
  })

  it('«Hoja» dice «falta un dato»; sin panel, «Vehículo» y «Cliente» no se dibujan, y sin vista previa tampoco ella', () => {
    const pasos = pasosDeLaHoja({
      faltaUnDato: true,
      vehiculo: null,
      cliente: null,
      vistaPrevia: null,
    })
    expect(pasos.map((p) => p.title)).toEqual(['Hoja: falta un dato'])
  })
})

describe('faltaUnDato', () => {
  it('sólo con un faltante requerido sin valor; sin respuesta, no', () => {
    const base = respuestaDePrueba()
    expect(faltaUnDato(null)).toBe(false)
    expect(faltaUnDato({ ...base, faltantes: [] })).toBe(false)
    expect(
      faltaUnDato({ ...base, faltantes: [{ codigo: 'requerido_sin_valor', donde: 'a' }] }),
    ).toBe(true)
    expect(faltaUnDato({ ...base, faltantes: [{ codigo: 'tabla_sin_filas', donde: 'a' }] })).toBe(
      false,
    )
  })
})
