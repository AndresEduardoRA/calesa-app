import { describe, expect, it } from 'vitest'
import {
  campoDeNotas,
  campoDelPais,
  campoPorNombre,
  datoDelCampo,
  necesitaElPaisDelTelefono,
  paisDeLosDatos,
} from './datos-clave-del-lead'

type Campo = {
  clave: string
  etiqueta: string
  activo: boolean
  tipo: 'texto' | 'texto_largo' | 'numero'
  soloCartera: boolean
}

function campo(datos: Partial<Campo> & { clave: string }): Campo {
  return { etiqueta: datos.clave, activo: true, tipo: 'texto', soloCartera: false, ...datos }
}

describe('campoPorNombre', () => {
  it('encuentra por etiqueta sin tildes, mayúsculas ni espacios en los bordes', () => {
    for (const etiqueta of ['País', 'pais', 'PAÍS', ' País ']) {
      expect(campoPorNombre([campo({ clave: 'x', etiqueta })], 'País')?.clave).toBe('x')
    }
  })

  it('encuentra por la clave', () => {
    expect(campoPorNombre([campo({ clave: 'pais', etiqueta: 'Nación' })], 'País')?.clave).toBe(
      'pais',
    )
  })

  it('«Países» no es «País» y uno apagado no cuenta', () => {
    expect(campoPorNombre([campo({ clave: 'paises', etiqueta: 'Países' })], 'País')).toBeNull()
    expect(
      campoPorNombre([campo({ clave: 'pais', etiqueta: 'País', activo: false })], 'País'),
    ).toBeNull()
  })

  it('el primero que coincide gana', () => {
    const campos = [campo({ clave: 'a', etiqueta: 'País' }), campo({ clave: 'pais' })]
    expect(campoDelPais(campos)?.clave).toBe('a')
  })
})

describe('campoDeNotas', () => {
  it('sólo si es un texto largo', () => {
    expect(campoDeNotas([campo({ clave: 'notas', tipo: 'texto_largo' })])?.clave).toBe('notas')
    expect(campoDeNotas([campo({ clave: 'notas', tipo: 'texto' })])).toBeNull()
    expect(
      campoDeNotas([campo({ clave: 'x', etiqueta: 'NOTAS', tipo: 'texto_largo' })])?.clave,
    ).toBe('x')
  })
})

describe('datoDelCampo', () => {
  const notas = campo({ clave: 'notas', tipo: 'texto_largo' })
  const privadas = campo({ clave: 'notas', tipo: 'texto_largo', soloCartera: true })

  it('sin campo, sin campo', () => {
    expect(datoDelCampo(null, { notas: 'x' }, true)).toEqual({ tipo: 'sin_campo' })
  })

  it('con valor, el valor', () => {
    expect(datoDelCampo(notas, { notas: 'Llamar el lunes' }, true)).toEqual({
      tipo: 'valor',
      campo: notas,
      valor: 'Llamar el lunes',
    })
  })

  it('vacío: sin la clave, nulo, en blanco o una lista vacía', () => {
    for (const atributos of [{}, { notas: null }, { notas: '   ' }, { notas: [] }]) {
      expect(datoDelCampo(notas, atributos, true).tipo).toBe('vacio')
    }
  })

  it('un privado que no llegó a quien no tiene el lead en su cartera se dice privado', () => {
    expect(datoDelCampo(privadas, {}, false).tipo).toBe('privado')
  })

  it('el mismo privado, en la cartera y sin valor, es vacío', () => {
    expect(datoDelCampo(privadas, {}, true).tipo).toBe('vacio')
  })

  it('un privado que sí llegó (está pasando a privado) se muestra', () => {
    expect(datoDelCampo(privadas, { notas: 'Hola' }, false).tipo).toBe('valor')
  })
})

describe('paisDeLosDatos', () => {
  const pais = campo({ clave: 'pais' })

  it('el campo con valor manda sobre el teléfono', () => {
    const dato = datoDelCampo(pais, { pais: 'Perú' }, true)
    expect(paisDeLosDatos({ dato, paisDelTelefono: 'Bolivia' })).toEqual({
      tipo: 'campo',
      campo: pais,
      valor: 'Perú',
    })
  })

  it('vacío o sin campo, el del teléfono; si tampoco, nada', () => {
    const vacio = datoDelCampo(pais, {}, true)
    expect(paisDeLosDatos({ dato: vacio, paisDelTelefono: 'Bolivia' })).toEqual({
      tipo: 'telefono',
      pais: 'Bolivia',
    })
    expect(paisDeLosDatos({ dato: { tipo: 'sin_campo' }, paisDelTelefono: 'Chile' })).toEqual({
      tipo: 'telefono',
      pais: 'Chile',
    })
    expect(paisDeLosDatos({ dato: vacio, paisDelTelefono: null })).toEqual({ tipo: 'nada' })
  })

  it('un privado ajeno no cae al teléfono', () => {
    const dato = datoDelCampo(campo({ clave: 'pais', soloCartera: true }), {}, false)
    expect(paisDeLosDatos({ dato, paisDelTelefono: 'Bolivia' })).toEqual({ tipo: 'privado' })
  })
})

describe('necesitaElPaisDelTelefono', () => {
  it('sólo sin dato del campo y con un número que dice su país', () => {
    expect(necesitaElPaisDelTelefono({ tipo: 'sin_campo' }, '59170000001')).toBe(true)
    expect(necesitaElPaisDelTelefono({ tipo: 'sin_campo' }, '+591 •••••01')).toBe(false)
    expect(necesitaElPaisDelTelefono({ tipo: 'sin_campo' }, '')).toBe(false)
    expect(
      necesitaElPaisDelTelefono({ tipo: 'valor', campo: null, valor: 'Perú' }, '59170000001'),
    ).toBe(false)
    expect(necesitaElPaisDelTelefono({ tipo: 'privado', campo: null }, '59170000001')).toBe(false)
  })
})
