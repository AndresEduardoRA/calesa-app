import { describe, expect, it } from 'vitest'
import { leerFiltros } from '@/shared/lib/filtros'
import type { CampoDeVehiculo } from './campo'
import { condicionesDe, esquemaDeFiltros } from './filtros'
import { esSubastaElegida, ordenElegido } from './filtros-de-subasta'
import { CONDICION_POR_DEFECTO } from './situacion'

const CAMPOS: CampoDeVehiculo[] = []
const FASES = [{ id: 'f1', nombre: 'En subasta', color: '#465fff', activa: true }]
const FUENTES = { campos: CAMPOS, fases: FASES, categorias: [] }
const DE_SUBASTA = { ...FUENTES, conSubasta: true }
// Viernes 20 de noviembre de 2026, 10:00 en La Paz.
const AHORA = '2026-11-20T14:00:00.000Z'
const OPCIONES = { zona: 'America/La_Paz', ahora: AHORA }

const condiciones = (parametros: Record<string, string>) =>
  condicionesDe(
    CAMPOS,
    leerFiltros(
      esquemaDeFiltros({ ...DE_SUBASTA, subastaElegida: esSubastaElegida(parametros['subasta']) }),
      parametros,
    ),
    OPCIONES,
  )

describe('el esquema en un origen de subasta', () => {
  it('«Subasta» (una a la vez) y el orden van primero, después «Fase»', () => {
    const esquema = esquemaDeFiltros(DE_SUBASTA)
    expect(esquema.filtros.slice(0, 3).map((filtro) => [filtro.clave, filtro.tipo])).toEqual([
      ['subasta', 'eleccion'],
      ['orden', 'eleccion'],
      ['fase', 'opciones'],
    ])
    const [subasta, orden] = esquema.filtros
    expect(subasta).toMatchObject({
      etiqueta: 'Subasta',
      porDefecto: 'cualquiera',
      opciones: [
        { valor: 'cualquiera', etiqueta: 'Cualquiera' },
        { valor: 'hoy', etiqueta: 'Cierra hoy' },
        { valor: '48h', etiqueta: 'Cierra en 48 h' },
        { valor: 'semana', etiqueta: 'Cierra esta semana' },
        { valor: 'vivas', etiqueta: 'Todas las vivas' },
        { valor: 'sin_resolver', etiqueta: 'Sin resolver' },
        { valor: 'no_ganadas', etiqueta: 'No ganadas' },
      ],
    })
    expect(orden).toMatchObject({
      etiqueta: 'Orden',
      porDefecto: 'reciente',
      opciones: [
        { valor: 'reciente', etiqueta: 'Más recientes' },
        { valor: 'cierre', etiqueta: 'Cierre más próximo' },
      ],
    })
  })

  it('«En subasta» aparece una sola vez: la fase (la situación ahora es «Todas las vivas»)', () => {
    const etiquetas = esquemaDeFiltros(DE_SUBASTA).filtros.flatMap((filtro) =>
      filtro.tipo === 'eleccion' || filtro.tipo === 'opciones'
        ? filtro.opciones.map((o) => o.etiqueta)
        : [],
    )
    expect(etiquetas.filter((etiqueta) => etiqueta === 'En subasta')).toHaveLength(1)
  })

  it('en un origen manual no hay «Subasta» ni orden, y lo que llegue por la URL no filtra', () => {
    const esquema = esquemaDeFiltros(FUENTES)
    expect(esquema.filtros.map((filtro) => filtro.clave)).not.toContain('subasta')
    expect(esquema.filtros.map((filtro) => filtro.clave)).not.toContain('orden')
    const valores = leerFiltros(esquema, { subasta: 'hoy', orden: 'cierre' })
    expect(condicionesDe(CAMPOS, valores, OPCIONES)).toEqual([CONDICION_POR_DEFECTO])
    expect(ordenElegido(esquema, valores)).toBe('reciente')
  })
})

describe('condicionesDe: «Subasta»', () => {
  it('«Cierra hoy», «en 48 h» y «esta semana»: una ventana del cierre desde ahora, con la de siempre', () => {
    expect(condiciones({ subasta: 'hoy' })).toEqual([
      { tipo: 'cierre_entre', desde: AHORA, hasta: '2026-11-21T04:00:00.000Z' },
      CONDICION_POR_DEFECTO,
    ])
    expect(condiciones({ subasta: '48h' })[0]).toEqual({
      tipo: 'cierre_entre',
      desde: AHORA,
      hasta: '2026-11-22T14:00:00.000Z',
    })
    expect(condiciones({ subasta: 'semana' })[0]).toEqual({
      tipo: 'cierre_entre',
      desde: AHORA,
      hasta: '2026-11-23T04:00:00.000Z',
    })
  })

  it('sin «ahora» una ventana no filtra (la página siempre lo pasa)', () => {
    const esquema = esquemaDeFiltros(DE_SUBASTA)
    expect(condicionesDe(CAMPOS, leerFiltros(esquema, { subasta: 'hoy' }))).toEqual([
      CONDICION_POR_DEFECTO,
    ])
  })

  it('«Todas las vivas» y «Sin resolver»: su situación, con la de siempre', () => {
    expect(condiciones({ subasta: 'vivas' })).toEqual([
      { tipo: 'situacion_en', situaciones: ['en_subasta'], fases: [], sinFase: false },
      CONDICION_POR_DEFECTO,
    ])
    expect(condiciones({ subasta: 'sin_resolver' })[0]).toEqual({
      tipo: 'situacion_en',
      situaciones: ['sin_resolver'],
      fases: [],
      sinFase: false,
    })
  })

  it('pedir las no ganadas es verlas: la de siempre ya no va', () => {
    expect(condiciones({ subasta: 'no_ganadas' })).toEqual([
      { tipo: 'situacion_en', situaciones: ['no_ganada'], fases: [], sinFase: false },
    ])
  })

  it('«Cualquiera» o un valor que no existe: sin filtrar', () => {
    expect(condiciones({ subasta: 'cualquiera' })).toEqual([CONDICION_POR_DEFECTO])
    expect(condiciones({ subasta: 'mañana' })).toEqual([CONDICION_POR_DEFECTO])
  })

  it('se combina con «Fase» con un Y: las sin resolver que siguen en esa fase', () => {
    expect(condiciones({ subasta: 'sin_resolver', fase: 'f1', q: 'rav4' })).toEqual([
      { tipo: 'busqueda', texto: 'rav4' },
      { tipo: 'situacion_en', situaciones: ['sin_resolver'], fases: [], sinFase: false },
      { tipo: 'columna_en', columna: 'fase_id', valores: ['f1'], incluirNulo: false },
      CONDICION_POR_DEFECTO,
    ])
  })
})

describe('el orden', () => {
  const orden = (parametros: Record<string, string>) => {
    const esquema = esquemaDeFiltros({
      ...DE_SUBASTA,
      subastaElegida: esSubastaElegida(parametros['subasta']),
    })
    return ordenElegido(esquema, leerFiltros(esquema, parametros))
  }

  it('sin «Subasta», «Más recientes»; con «Subasta», «Cierre más próximo»', () => {
    expect(orden({})).toBe('reciente')
    expect(orden({ subasta: 'cualquiera' })).toBe('reciente')
    expect(orden({ subasta: 'hoy' })).toBe('cierre')
    expect(orden({ subasta: 'sin_resolver' })).toBe('cierre')
  })

  it('lo elegido gana al por defecto, para los dos lados', () => {
    expect(orden({ orden: 'cierre' })).toBe('cierre')
    expect(orden({ subasta: 'vivas', orden: 'reciente' })).toBe('reciente')
    expect(orden({ orden: 'otro' })).toBe('reciente')
  })

  it('el orden por defecto no es un filtro (ni chip ni clave en la URL)', () => {
    const esquema = esquemaDeFiltros({ ...DE_SUBASTA, subastaElegida: true })
    expect(
      leerFiltros(esquema, { subasta: 'hoy', orden: 'cierre' }).porClave['orden'],
    ).toBeUndefined()
    expect(leerFiltros(esquema, { subasta: 'hoy', orden: 'reciente' }).porClave['orden']).toEqual({
      tipo: 'eleccion',
      valor: 'reciente',
    })
  })

  it('esSubastaElegida: sólo un valor que filtra', () => {
    expect(esSubastaElegida('hoy')).toBe(true)
    expect(esSubastaElegida('no_ganadas')).toBe(true)
    expect(esSubastaElegida('cualquiera')).toBe(false)
    expect(esSubastaElegida('otro')).toBe(false)
    expect(esSubastaElegida(undefined)).toBe(false)
  })
})
