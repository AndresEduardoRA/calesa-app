import { describe, expect, it } from 'vitest'
import {
  alEscribirElTitulo,
  estadoDelTituloGuardado,
  largoDelTitulo,
  limpiarTitulo,
  TITULO_AUTOMATICO,
  tituloAutomatico,
  tituloCambio,
  tituloDeLaCotizacion,
  tituloMostrado,
  tituloParaGuardar,
  TOPE_DEL_TITULO,
} from './titulo-de-la-cotizacion'

describe('limpiarTitulo', () => {
  it('quita sólo los espacios de los costados, como btrim de la base; vacío es sin título', () => {
    expect(limpiarTitulo('  Toyota  ')).toBe('Toyota')
    expect(limpiarTitulo('   ')).toBeNull()
    expect(limpiarTitulo('')).toBeNull()
    expect(limpiarTitulo(null)).toBeNull()
    // Un tabulador o un salto no son espacio para btrim: se quedan.
    expect(limpiarTitulo('\tA\n')).toBe('\tA\n')
    expect(limpiarTitulo(' A  B ')).toBe('A  B')
  })
})

describe('tituloAutomatico', () => {
  it('es el del vehículo sin espacios a los costados', () => {
    expect(tituloAutomatico('  Toyota Hilux 2020 ')).toBe('Toyota Hilux 2020')
    expect(tituloAutomatico(null)).toBeNull()
    expect(tituloAutomatico('   ')).toBeNull()
  })

  it('corta en 120 puntos de código (un emoji cuenta uno) y vuelve a quitar los espacios', () => {
    const largo = 'a'.repeat(150)
    expect(tituloAutomatico(largo)).toBe('a'.repeat(TOPE_DEL_TITULO))
    // El emoji en el lugar 120: entra entero (dos unidades UTF-16, un punto de código).
    const conEmoji = `${'a'.repeat(119)}🚗resto`
    const cortado = tituloAutomatico(conEmoji)
    expect(cortado).toBe(`${'a'.repeat(119)}🚗`)
    expect(largoDelTitulo(cortado ?? '')).toBe(120)
    // Lo que queda con espacios al final del corte los pierde.
    expect(tituloAutomatico(`${'a'.repeat(118)}   bbb`)).toBe('a'.repeat(118))
  })
})

describe('tituloDeLaCotizacion', () => {
  it('el título; si no tiene, el del vehículo; si tampoco, «Cotización n.º N»', () => {
    expect(tituloDeLaCotizacion({ titulo: 'Para Juan', vehiculo: 'Hilux', numero: 7 })).toEqual({
      texto: 'Para Juan',
      fuente: 'titulo',
    })
    expect(tituloDeLaCotizacion({ titulo: null, vehiculo: 'Hilux', numero: 7 })).toEqual({
      texto: 'Hilux',
      fuente: 'vehiculo',
    })
    expect(tituloDeLaCotizacion({ titulo: '  ', vehiculo: ' ', numero: 1234 })).toEqual({
      texto: 'Cotización n.º 1234',
      fuente: 'numero',
    })
  })

  it('sin número (la hoja nueva) y sin nada más, nulo', () => {
    expect(tituloDeLaCotizacion({ titulo: null, vehiculo: null, numero: null })).toBeNull()
  })
})

describe('el estado del título', () => {
  it('escribir lo vuelve manual; vaciarlo o dejar sólo espacios lo devuelve a automático', () => {
    const manual = alEscribirElTitulo(' Para Ana')
    expect(manual).toEqual({ texto: ' Para Ana', manual: true })
    expect(alEscribirElTitulo('')).toEqual(TITULO_AUTOMATICO)
    expect(alEscribirElTitulo('   ')).toEqual(TITULO_AUTOMATICO)
  })

  it('se muestra el manual o, automático, el del vehículo elegido (cambiar de vehículo respeta el manual)', () => {
    const manual = alEscribirElTitulo('Para Ana ')
    expect(tituloMostrado(manual, 'Hilux')).toBe('Para Ana')
    expect(tituloMostrado(manual, 'Corolla')).toBe('Para Ana')
    expect(tituloMostrado(TITULO_AUTOMATICO, 'Hilux')).toBe('Hilux')
    expect(tituloMostrado(TITULO_AUTOMATICO, 'Corolla')).toBe('Corolla')
    expect(tituloMostrado(TITULO_AUTOMATICO, null)).toBeNull()
  })

  it('al guardar, el texto limpio sólo si es manual', () => {
    expect(tituloParaGuardar(alEscribirElTitulo('  Para Ana '))).toEqual({
      titulo: 'Para Ana',
      tituloManual: true,
    })
    expect(tituloParaGuardar(TITULO_AUTOMATICO)).toEqual({ titulo: null, tituloManual: false })
    // Un estado manual sin texto (no debería armarse) se guarda como automático.
    expect(tituloParaGuardar({ texto: '  ', manual: true })).toEqual({
      titulo: null,
      tituloManual: false,
    })
  })

  it('una guardada abre manual sólo si lo es y tiene texto', () => {
    expect(estadoDelTituloGuardado('Para Ana', true)).toEqual({ texto: 'Para Ana', manual: true })
    expect(estadoDelTituloGuardado('Hilux', false)).toEqual(TITULO_AUTOMATICO)
    expect(estadoDelTituloGuardado(null, true)).toEqual(TITULO_AUTOMATICO)
  })

  it('cambió si cambia el modo o, manual, el texto limpio', () => {
    const guardado = estadoDelTituloGuardado('Para Ana', true)
    expect(tituloCambio(alEscribirElTitulo('Para Ana  '), guardado)).toBe(false)
    expect(tituloCambio(alEscribirElTitulo('Para Luis'), guardado)).toBe(true)
    expect(tituloCambio(TITULO_AUTOMATICO, guardado)).toBe(true)
    expect(tituloCambio(TITULO_AUTOMATICO, TITULO_AUTOMATICO)).toBe(false)
  })
})

describe('el título de una guardada que cambia de vehículo (T315)', () => {
  it('automático: pasa al título del vehículo nuevo y no es un cambio del título (el cambio es el vehículo)', () => {
    const guardado = estadoDelTituloGuardado('Toyota Corolla', false)
    expect(tituloMostrado(guardado, 'Mazda 3')).toBe('Mazda 3')
    expect(tituloCambio(guardado, guardado)).toBe(false)
    expect(tituloParaGuardar(guardado)).toEqual({ titulo: null, tituloManual: false })
  })

  it('manual: se respeta con el vehículo nuevo y viaja tal cual', () => {
    const guardado = estadoDelTituloGuardado('Para Ana', true)
    expect(tituloMostrado(guardado, 'Mazda 3')).toBe('Para Ana')
    expect(tituloParaGuardar(guardado)).toEqual({ titulo: 'Para Ana', tituloManual: true })
  })

  it('un manual vaciado vuelve al título del vehículo nuevo, y eso sí cambia el título', () => {
    const guardado = estadoDelTituloGuardado('Para Ana', true)
    const vaciado = alEscribirElTitulo('')
    expect(tituloMostrado(vaciado, 'Mazda 3')).toBe('Mazda 3')
    expect(tituloCambio(vaciado, guardado)).toBe(true)
  })
})
