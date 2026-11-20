import { describe, expect, it } from 'vitest'
import {
  agruparDelListado,
  agruparLaPagina,
  conteoDelGrupo,
  cotizacionDeLaEntrada,
  grupoQueCambio,
  leerAgrupar,
  idDelVehiculoDelModal,
  lineasDelGrupo,
  tituloDelModalDelGrupo,
  textoDelConteo,
} from './grupos-del-listado'

const fila = (id: string, vehiculoId: string | null, minuto: number) => ({
  id,
  vehiculoId,
  creadoEn: `2026-11-19T10:${String(minuto).padStart(2, '0')}:00.000000+00:00`,
})

describe('agruparDelListado', () => {
  it('sin elegir, agrupa', () => {
    expect(agruparDelListado({ pedida: null, preferida: null, vehiculo: false })).toBe(true)
  })

  it('la URL manda sobre la preferencia, en los dos sentidos', () => {
    expect(agruparDelListado({ pedida: 'no', preferida: true, vehiculo: false })).toBe(false)
    expect(agruparDelListado({ pedida: 'si', preferida: false, vehiculo: false })).toBe(true)
  })

  it('sin URL, la preferencia; un valor raro en la URL es como no decir nada', () => {
    expect(agruparDelListado({ pedida: undefined, preferida: false, vehiculo: false })).toBe(false)
    expect(agruparDelListado({ pedida: 'tal vez', preferida: false, vehiculo: false })).toBe(false)
  })

  it('con las de un solo vehículo nunca agrupa, aunque se pida', () => {
    expect(agruparDelListado({ pedida: 'si', preferida: true, vehiculo: true })).toBe(false)
  })

  it('leerAgrupar sólo entiende «si» o «no»', () => {
    expect(leerAgrupar('si')).toBe('si')
    expect(leerAgrupar('no')).toBe('no')
    expect(leerAgrupar('Si')).toBeNull()
    expect(leerAgrupar(undefined)).toBeNull()
  })
})

describe('agruparLaPagina (la de una búsqueda)', () => {
  it('cada vehículo va donde aparece su más reciente, con las suyas de la página; las sin vehículo, sueltas en su lugar', () => {
    const filas = [
      fila('a', 'v1', 50),
      fila('s', null, 40),
      fila('b', 'v2', 30),
      fila('c', 'v1', 20),
    ]
    const entradas = agruparLaPagina(filas, new Set())
    expect(
      entradas.map((e) =>
        e.tipo === 'grupo'
          ? `g ${e.ordenId} ${e.cabeza.id} ${String(e.conteo.n)}`
          : `s ${e.ordenId}`,
      ),
    ).toEqual(['g a a 2', 's s', 'g b b 1'])
  })

  it('la cabeza es la aprobada si está en la página; el orden sigue siendo el de la más reciente', () => {
    const filas = [fila('a', 'v1', 50), fila('b', 'v1', 30), fila('c', 'v1', 20)]
    const [grupo] = agruparLaPagina(filas, new Set(['c']))
    expect(grupo?.tipo === 'grupo' && [grupo.ordenId, grupo.cabeza.id, grupo.conteo]).toEqual([
      'a',
      'c',
      { n: 3, hayMas: false },
    ])
    expect(grupo && cotizacionDeLaEntrada(grupo).id).toBe('c')
  })
})

describe('el conteo del grupo', () => {
  it('con una sola no dice nada; con más, cuántas, y con más de 100, «100+»', () => {
    expect(textoDelConteo(conteoDelGrupo(1))).toBeNull()
    expect(textoDelConteo(conteoDelGrupo(3))).toBe('3 cotizaciones de este vehículo')
    expect(textoDelConteo(conteoDelGrupo(100))).toBe('100 cotizaciones de este vehículo')
    expect(textoDelConteo(conteoDelGrupo(101))).toBe('100+ cotizaciones de este vehículo')
  })
})

describe('el modal de un grupo', () => {
  it('la cabeza ya no vale si la primera página no empieza por la cotización del orden', () => {
    expect(grupoQueCambio({ ordenId: 'a' }, [{ id: 'a' }, { id: 'b' }])).toBe(false)
    expect(grupoQueCambio({ ordenId: 'a' }, [{ id: 'n' }, { id: 'a' }])).toBe(true)
    expect(grupoQueCambio({ ordenId: 'a' }, [])).toBe(true)
  })

  it('las líneas: la cabeza primero y las demás sin repetirla', () => {
    expect(
      lineasDelGrupo({ id: 'c' }, [{ id: 'a' }, { id: 'c' }, { id: 'b' }]).map((f) => f.id),
    ).toEqual(['c', 'a', 'b'])
  })

  it('sin cabeza (el grupo no está en la página), las leídas en su orden', () => {
    expect(lineasDelGrupo(null, [{ id: 'a' }, { id: 'b' }]).map((f) => f.id)).toEqual(['a', 'b'])
  })

  it('el título dice el vehículo, o «este vehículo» si no se conoce', () => {
    expect(tituloDelModalDelGrupo('Toyota Hilux 2019')).toBe('Cotizaciones de Toyota Hilux 2019')
    expect(tituloDelModalDelGrupo(null)).toBe('Cotizaciones de este vehículo')
    expect(tituloDelModalDelGrupo('  ')).toBe('Cotizaciones de este vehículo')
  })

  it('el vehículo del enlace es un guid en minúsculas; otra cosa no abre nada', () => {
    const id = '0A0A0A0A-0000-4000-8000-0000000000AA'
    expect(idDelVehiculoDelModal(id)).toBe(id.toLowerCase())
    expect(idDelVehiculoDelModal('hilux')).toBeNull()
    expect(idDelVehiculoDelModal(null)).toBeNull()
  })
})
