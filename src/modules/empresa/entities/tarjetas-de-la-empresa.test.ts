import { describe, expect, it } from 'vitest'
import type { AjustesEmpresa } from './ajustes-empresa'
import {
  borradorDeLaTarjeta,
  cambiosDeLaTarjeta,
  CAMPOS_DE_LA_TARJETA,
  tarjetaDelPanel,
  TARJETAS_DE_LA_EMPRESA,
} from './tarjetas-de-la-empresa'

const AJUSTES: AjustesEmpresa = {
  nombre: 'Importadora Andina',
  razonSocial: 'Andina SRL',
  nit: null,
  direccion: null,
  ciudad: 'La Paz',
  pais: 'Bolivia',
  telefono: null,
  telefonoCc: '+591',
  whatsapp: null,
  email: null,
  logoRuta: null,
  logoOscuroRuta: null,
  colorAcento: '#0b7285',
  iconos: null,
  locale: 'es-BO',
  zonaHoraria: 'America/La_Paz',
  monedaBase: 'USD',
  registroAbierto: false,
  papeleraDias: 30,
  actividadDias: 14,
  limpiezaAutomatica: true,
  limpiezaDiasGracia: 7,
  actualizadoEn: '2026-10-12T14:00:00+00:00',
}

const LIBRE = { conDatosCargados: false }

describe('las tarjetas de la empresa', () => {
  it('el panel de cada tarjeta es su nombre y uno desconocido no es ninguna', () => {
    for (const tarjeta of TARJETAS_DE_LA_EMPRESA) {
      expect(tarjetaDelPanel(tarjeta)).toBe(tarjeta)
    }
    expect(tarjetaDelPanel('nueva-moneda')).toBeNull()
    expect(tarjetaDelPanel(null)).toBeNull()
  })

  it('ningún campo está en dos tarjetas', () => {
    const todos = Object.values(CAMPOS_DE_LA_TARJETA).flat()
    expect(new Set(todos).size).toBe(todos.length)
  })
})

describe('borradorDeLaTarjeta', () => {
  it('muestra lo guardado: lo vacío como texto vacío y los números como texto', () => {
    expect(borradorDeLaTarjeta('datos-legales', AJUSTES)).toEqual({
      razonSocial: 'Andina SRL',
      nit: '',
      direccion: '',
      ciudad: 'La Paz',
      telefono: '',
      whatsapp: '',
      email: '',
    })
    expect(borradorDeLaTarjeta('politicas', AJUSTES)).toEqual({
      registroAbierto: false,
      papeleraDias: '30',
      actividadDias: '14',
      limpiezaAutomatica: true,
      limpiezaDiasGracia: '7',
    })
    expect(borradorDeLaTarjeta('identidad', { ...AJUSTES, colorAcento: null })).toEqual({
      nombre: 'Importadora Andina',
      colorAcento: '',
    })
  })
})

describe('cambiosDeLaTarjeta', () => {
  it('sin diferencias da null, aunque el texto lleve espacios de más', () => {
    const escrito = { ...borradorDeLaTarjeta('region', AJUSTES), pais: ' Bolivia ' }
    expect(cambiosDeLaTarjeta('region', AJUSTES, escrito, LIBRE)).toBeNull()
  })

  it('manda sólo lo que cambió, de la tarjeta que se edita', () => {
    const escrito = { ...borradorDeLaTarjeta('datos-legales', AJUSTES), nit: '1020304050' }
    expect(cambiosDeLaTarjeta('datos-legales', AJUSTES, escrito, LIBRE)).toEqual({
      nit: '1020304050',
    })
  })

  it('vaciar un dato guardado viaja como texto vacío (sin dato), no se omite', () => {
    const escrito = { ...borradorDeLaTarjeta('datos-legales', AJUSTES), razonSocial: '' }
    expect(cambiosDeLaTarjeta('datos-legales', AJUSTES, escrito, LIBRE)).toEqual({
      razonSocial: '',
    })
  })

  it('los números van convertidos y los interruptores como booleanos', () => {
    const escrito = {
      ...borradorDeLaTarjeta('politicas', AJUSTES),
      papeleraDias: '45',
      registroAbierto: true,
    }
    expect(cambiosDeLaTarjeta('politicas', AJUSTES, escrito, LIBRE)).toEqual({
      papeleraDias: 45,
      registroAbierto: true,
    })
  })

  it('un número en blanco no se vuelve 0: es NaN y el esquema lo rechaza con su motivo', () => {
    const escrito = { ...borradorDeLaTarjeta('politicas', AJUSTES), actividadDias: '  ' }
    expect(cambiosDeLaTarjeta('politicas', AJUSTES, escrito, LIBRE)?.actividadDias).toBeNaN()
  })

  it('la moneda base no viaja con datos cargados, aunque se haya tocado', () => {
    const escrito = { ...borradorDeLaTarjeta('moneda-base', AJUSTES), monedaBase: 'BOB' }
    expect(
      cambiosDeLaTarjeta('moneda-base', AJUSTES, escrito, { conDatosCargados: true }),
    ).toBeNull()
    expect(cambiosDeLaTarjeta('moneda-base', AJUSTES, escrito, LIBRE)).toEqual({
      monedaBase: 'BOB',
    })
  })

  it('el color se compara con lo guardado: quitarlo es un cambio', () => {
    const escrito = { ...borradorDeLaTarjeta('identidad', AJUSTES), colorAcento: '' }
    expect(cambiosDeLaTarjeta('identidad', AJUSTES, escrito, LIBRE)).toEqual({ colorAcento: '' })
  })
})
