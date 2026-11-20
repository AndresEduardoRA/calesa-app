import { describe, expect, it } from 'vitest'
import { entradaDeAjustes, type AjustesDelSitio } from './ajustes'
import {
  CAMPOS_DE_LA_TARJETA,
  direccionCorta,
  escritoInicial,
  hayCambiosDeTexto,
} from './tarjetas-del-sitio'

const ajustes: AjustesDelSitio = {
  nombreSitio: 'Autos del Sur',
  lema: null,
  whatsappRespaldo: '+59170000000',
  horario: null,
  direccionPublica: 'https://autos-del-sur.example',
  redes: { instagram: 'https://instagram.com/autos' },
  seo: { titulo: 'Autos' },
  mostrarMonedaSecundaria: true,
  origenesVisibles: ['a', 'b'],
  actualizadoEn: '2026-11-20T10:00:00.000001+00:00',
}

describe('entradaDeAjustes', () => {
  it('vuelve lo guardado a lo que escribe la persona: sin dato es un texto vacío', () => {
    const entrada = entradaDeAjustes(ajustes)
    expect(entrada.nombreSitio).toBe('Autos del Sur')
    expect(entrada.lema).toBe('')
    expect(entrada.instagram).toBe('https://instagram.com/autos')
    expect(entrada.facebook).toBe('')
    expect(entrada.seoTitulo).toBe('Autos')
    expect(entrada.seoDescripcion).toBe('')
    expect(entrada.origenesVisibles).toEqual(['a', 'b'])
    expect(entrada.mostrarMonedaSecundaria).toBe(true)
  })
})

describe('tarjetas de texto', () => {
  const guardado = entradaDeAjustes(ajustes)

  it('cada tarjeta parte sólo de sus campos', () => {
    expect(Object.keys(escritoInicial('identidad', guardado))).toEqual(['nombreSitio', 'lema'])
    expect(Object.keys(escritoInicial('redes', guardado))).toHaveLength(6)
    expect(CAMPOS_DE_LA_TARJETA.seo).toEqual(['seoTitulo', 'seoDescripcion'])
  })

  it('hay cambios sólo si algo difiere de lo guardado; los espacios de los bordes no cuentan', () => {
    const inicial = escritoInicial('identidad', guardado)
    expect(hayCambiosDeTexto('identidad', guardado, inicial)).toBe(false)
    expect(
      hayCambiosDeTexto('identidad', guardado, { ...inicial, nombreSitio: ' Autos del Sur ' }),
    ).toBe(false)
    expect(hayCambiosDeTexto('identidad', guardado, { ...inicial, lema: 'Del puerto' })).toBe(true)
  })
})

describe('direccionCorta', () => {
  it('quita el esquema y la barra final', () => {
    expect(direccionCorta('https://instagram.com/autos/')).toBe('instagram.com/autos')
  })
})
