import { describe, expect, it } from 'vitest'
import {
  esquemaAjustes,
  esquemaCambiosDeAjustes,
  esquemaDeLaTarjeta,
  type EntradaDeAjustes,
} from './ajustes'

const valida: EntradaDeAjustes = {
  nombre: '  Importadora Andina ',
  colorAcento: '#0B7285',
  razonSocial: '',
  nit: ' 1020304050 ',
  direccion: '',
  ciudad: 'Santa Cruz',
  telefono: '',
  telefonoCc: '',
  whatsapp: '',
  email: '',
  pais: 'Bolivia',
  locale: 'es-bo',
  zonaHoraria: 'America/La_Paz',
  monedaBase: 'USD',
  registroAbierto: false,
  papeleraDias: 30,
  actividadDias: 14,
  limpiezaAutomatica: true,
  limpiezaDiasGracia: 7,
  actualizadoEnEsperado: '2026-10-12T14:00:00+00:00',
}

function errorDe(entrada: Partial<EntradaDeAjustes>, campo: string): string | undefined {
  const leida = esquemaAjustes.safeParse({ ...valida, ...entrada })
  return leida.success
    ? undefined
    : leida.error.issues.find((problema) => problema.path[0] === campo)?.message
}

describe('esquemaAjustes', () => {
  it('limpia los textos, deja vacío como «sin dato» y normaliza locale y color', () => {
    const leida = esquemaAjustes.parse(valida)
    expect(leida.nombre).toBe('Importadora Andina')
    expect(leida.razonSocial).toBeNull()
    expect(leida.nit).toBe('1020304050')
    expect(leida.email).toBeNull()
    expect(leida.locale).toBe('es-BO')
    expect(leida.colorAcento).toBe('#0b7285')
  })

  it('sin color vale: quedan los colores neutros', () => {
    expect(esquemaAjustes.parse({ ...valida, colorAcento: '' }).colorAcento).toBeNull()
  })

  it('un color sin contraste se rechaza con su motivo', () => {
    expect(errorDe({ colorAcento: '#ff0000' }, 'colorAcento')).toContain('hace falta 4,5:1')
  })

  it('locale y zona horaria se validan contra Intl', () => {
    expect(errorDe({ locale: 'boliviano' }, 'locale')).toContain('formato regional')
    expect(errorDe({ zonaHoraria: 'Marte/Olympus' }, 'zonaHoraria')).toContain('zona horaria')
    expect(errorDe({ zonaHoraria: 'America/Santiago' }, 'zonaHoraria')).toBeUndefined()
  })

  it('el logo: sin clave no se toca, null lo quita, y sólo vale una ruta de logos', () => {
    expect(esquemaAjustes.parse(valida).logoRuta).toBeUndefined()
    expect(esquemaAjustes.parse({ ...valida, logoRuta: null }).logoRuta).toBeNull()
    expect(errorDe({ logoRuta: 'iconos/x.png' }, 'logoRuta')).toBe('El logo no se subió bien.')
    expect(errorDe({ logoRuta: `logos/${'a'.repeat(64)}.svg` }, 'logoRuta')).toBeUndefined()
  })

  it('el logo oscuro: igual que el normal', () => {
    expect(esquemaAjustes.parse(valida).logoOscuroRuta).toBeUndefined()
    expect(esquemaAjustes.parse({ ...valida, logoOscuroRuta: null }).logoOscuroRuta).toBeNull()
    expect(errorDe({ logoOscuroRuta: 'iconos/x.png' }, 'logoOscuroRuta')).toBe(
      'El logo oscuro no se subió bien.',
    )
  })

  it('la retención va de 1 a 365 días enteros', () => {
    expect(errorDe({ papeleraDias: 0 }, 'papeleraDias')).toBe('Como mínimo, 1 día.')
    expect(errorDe({ actividadDias: 366 }, 'actividadDias')).toBe('Como máximo, 365 días.')
    expect(errorDe({ papeleraDias: 1.5 }, 'papeleraDias')).toContain('sin decimales')
    expect(errorDe({ papeleraDias: Number.NaN }, 'papeleraDias')).toBe('Escribe un número de días.')
  })

  it('los días de gracia de la limpieza van de 1 a 90 días enteros', () => {
    expect(errorDe({ limpiezaDiasGracia: 0 }, 'limpiezaDiasGracia')).toBe('Como mínimo, 1 día.')
    expect(errorDe({ limpiezaDiasGracia: 91 }, 'limpiezaDiasGracia')).toBe('Como máximo, 90 días.')
    expect(errorDe({ limpiezaDiasGracia: 2.5 }, 'limpiezaDiasGracia')).toContain('sin decimales')
    expect(errorDe({ limpiezaDiasGracia: 7 }, 'limpiezaDiasGracia')).toBeUndefined()
    expect(errorDe({ limpiezaDiasGracia: 90 }, 'limpiezaDiasGracia')).toBeUndefined()
  })

  it('el código de país lleva «+» y de 1 a 3 dígitos, o queda vacío', () => {
    const dato = (telefonoCc: string) => {
      const leida = esquemaAjustes.safeParse({ ...valida, telefonoCc })
      return leida.success ? leida.data.telefonoCc : 'ERROR'
    }
    expect(dato(' +54 ')).toBe('+54')
    expect(dato('')).toBeNull()
    for (const mal of ['591', '+', '+0591', '+5911', '+5 1', '++59']) {
      expect(dato(mal)).toBe('ERROR')
      expect(errorDe({ telefonoCc: mal }, 'telefonoCc')).toContain('código de país')
    }
  })

  it('exige nombre, país y un correo con forma de correo', () => {
    expect(errorDe({ nombre: ' ' }, 'nombre')).toBe('Escribe el nombre de la empresa.')
    expect(errorDe({ pais: '' }, 'pais')).toBe('Escribe el país.')
    expect(errorDe({ email: 'ventas' }, 'email')).toBe('Ese correo no parece válido.')
  })

  it('la moneda base puede no viajar (con datos cargados no se cambia)', () => {
    const { monedaBase: _sinMoneda, ...sinMoneda } = valida
    expect(esquemaAjustes.parse(sinMoneda).monedaBase).toBeUndefined()
  })
})

describe('esquemaCambiosDeAjustes (lo que guarda una tarjeta)', () => {
  const version = '2026-10-12T14:00:00+00:00'

  it('acepta sólo las claves que cambiaron, con su versión, y las limpia como el esquema entero', () => {
    const leida = esquemaCambiosDeAjustes.parse({
      nit: ' 1020304050 ',
      colorAcento: '',
      actualizadoEnEsperado: version,
    })
    expect(leida).toEqual({ nit: '1020304050', colorAcento: null, actualizadoEnEsperado: version })
    expect('nombre' in leida).toBe(false)
  })

  it('sin la versión no pasa', () => {
    expect(esquemaCambiosDeAjustes.safeParse({ nit: '1' }).success).toBe(false)
  })

  it('sin ningún cambio no pasa: guardar vacío no mueve la versión', () => {
    expect(esquemaCambiosDeAjustes.safeParse({ actualizadoEnEsperado: version }).success).toBe(
      false,
    )
  })

  it('una clave desconocida no pasa', () => {
    expect(
      esquemaCambiosDeAjustes.safeParse({ nit: '1', raro: 'x', actualizadoEnEsperado: version })
        .success,
    ).toBe(false)
  })

  it('cada campo sigue con su regla: una zona inexistente o un color sin contraste se rechazan', () => {
    const zona = esquemaCambiosDeAjustes.safeParse({
      zonaHoraria: 'Marte/Olimpo',
      actualizadoEnEsperado: version,
    })
    expect(zona.success).toBe(false)
    const color = esquemaCambiosDeAjustes.safeParse({
      colorAcento: '#ff0000',
      actualizadoEnEsperado: version,
    })
    expect(color.success).toBe(false)
  })
})

describe('esquemaDeLaTarjeta', () => {
  it('valida sólo los campos de su tarjeta y acepta que falten los que no cambiaron', () => {
    const politicas = esquemaDeLaTarjeta('politicas')
    expect(politicas.safeParse({ papeleraDias: 45 }).success).toBe(true)
    expect(politicas.safeParse({ papeleraDias: 0 }).success).toBe(false)
    expect(politicas.safeParse({ papeleraDias: Number.NaN }).success).toBe(false)
    // Una clave de otra tarjeta no entra al esquema de ésta.
    expect(Object.keys(politicas.parse({ papeleraDias: 45, nit: 'x' }))).toEqual(['papeleraDias'])
  })

  it('el código de país de Región dice su motivo', () => {
    const leida = esquemaDeLaTarjeta('region').safeParse({ telefonoCc: '591' })
    expect(leida.success ? null : leida.error.issues[0]?.message).toBe(
      'El código de país lleva un «+» y de 1 a 3 dígitos.',
    )
  })
})
