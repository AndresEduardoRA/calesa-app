import { describe, expect, it } from 'vitest'
import { conSituacionTraducida, destinoDeLaSituacionVieja } from './situacion-vieja'

const ORIGEN = '00000000-0000-4000-8000-0000000000a1'
const FASE = '00000000-0000-4000-8000-0000000000f1'
const OTRA = '00000000-0000-4000-8000-0000000000f2'

const destino = (parametros: Record<string, string | string[] | undefined>) => {
  const texto = destinoDeLaSituacionVieja(parametros)
  return texto === null ? null : Object.fromEntries(new URL(texto, 'http://x').searchParams)
}

describe('destinoDeLaSituacionVieja', () => {
  it('cada situación propia va a su valor de «Subasta», con el resto de la consulta', () => {
    expect(destino({ origen: ORIGEN, q: 'kia', situacion: 'en_subasta' })).toEqual({
      origen: ORIGEN,
      q: 'kia',
      subasta: 'vivas',
    })
    expect(destino({ situacion: 'sin_resolver' })).toEqual({ subasta: 'sin_resolver' })
    expect(destino({ situacion: 'no_ganada' })).toEqual({ subasta: 'no_ganadas' })
  })

  it('las fases y «Sin fase» van a «Fase»', () => {
    expect(destino({ origen: ORIGEN, situacion: `${FASE},ninguna` })).toEqual({
      origen: ORIGEN,
      fase: `${FASE},ninguna`,
    })
  })

  it('varias propias: gana la primera del orden de «Subasta»; las fases siguen aparte', () => {
    expect(destino({ situacion: `no_ganada,${FASE},sin_resolver` })).toEqual({
      subasta: 'sin_resolver',
      fase: FASE,
    })
  })

  it('respeta un «subasta» o un «fase» que ya estén en la URL', () => {
    expect(destino({ subasta: 'hoy', fase: OTRA, situacion: `en_subasta,${FASE}` })).toEqual({
      subasta: 'hoy',
      fase: OTRA,
    })
  })

  it('quita el cursor (era de otro filtro) y lo que no se entiende', () => {
    expect(destino({ origen: ORIGEN, cursor: 'abc', situacion: 'cualquier-cosa' })).toEqual({
      origen: ORIGEN,
    })
    expect(destinoDeLaSituacionVieja({ situacion: '' })).toBe('/vehiculos')
  })

  it('sin «situacion», no es un enlace viejo', () => {
    expect(destinoDeLaSituacionVieja({ origen: ORIGEN, subasta: 'vivas' })).toBeNull()
  })
})

describe('conSituacionTraducida', () => {
  it('lee una vista vieja con las claves nuevas, sin el cursor', () => {
    const vista = {
      id: 'v1',
      nombre: 'Perdidas',
      params: { origen: ORIGEN, situacion: 'no_ganada', cursor: 'x' },
    }
    expect(conSituacionTraducida(vista)).toEqual({
      id: 'v1',
      nombre: 'Perdidas',
      params: { origen: ORIGEN, subasta: 'no_ganadas' },
    })
  })

  it('una vista sin «situacion» queda igual (la misma)', () => {
    const vista = { params: { origen: ORIGEN, subasta: 'vivas' } }
    expect(conSituacionTraducida(vista)).toBe(vista)
  })
})
