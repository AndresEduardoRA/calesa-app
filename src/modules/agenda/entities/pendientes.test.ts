import { describe, expect, it } from 'vitest'
import {
  cuandoDelPendiente,
  cursorDePendientes,
  gruposDePendientes,
  paginaDePendientes,
  textoDelTopeDePendientes,
} from './pendientes'

const ID_A = '11111111-1111-4111-8111-111111111111'
const ID_B = '22222222-2222-4222-8222-222222222222'
const VERSION = '2026-11-12T10:00:00.654321+00:00'
const ZONA = 'America/La_Paz'

describe('gruposDePendientes', () => {
  it('«Qué ver» decide los grupos: tareas → vencidas y sin fecha; recordatorios → recordatorios', () => {
    expect(gruposDePendientes(['evento', 'tarea', 'recordatorio', 'subasta'])).toEqual([
      'vencidas',
      'recordatorios',
      'sin_fecha',
    ])
    expect(gruposDePendientes(['tarea'])).toEqual(['vencidas', 'sin_fecha'])
    expect(gruposDePendientes(['recordatorio', 'evento'])).toEqual(['recordatorios'])
    expect(gruposDePendientes(['evento', 'subasta'])).toEqual([])
  })
})

describe('paginaDePendientes', () => {
  it('vencidas: tareas con su vencimiento como instante y como cursor', () => {
    const pagina = paginaDePendientes('vencidas', {
      filas: [
        {
          id: ID_A,
          titulo: 'Llamar',
          vence_en: '2026-11-15T22:00:00.123456+00:00',
          actualizado_en: VERSION,
        },
      ],
      hay_mas: true,
    })
    expect(pagina).toEqual({
      filas: [
        {
          clase: 'tarea',
          id: ID_A,
          titulo: 'Llamar',
          instante: '2026-11-15T22:00:00.123456+00:00',
          actualizadoEn: VERSION,
          orden: '2026-11-15T22:00:00.123456+00:00',
        },
      ],
      hayMas: true,
    })
  })

  it('recordatorios: de clase recordatorio, con su hora', () => {
    const pagina = paginaDePendientes('recordatorios', {
      filas: [
        {
          id: ID_B,
          titulo: 'Ver',
          recordar_en: '2026-11-17T14:00:00+00:00',
          actualizado_en: VERSION,
        },
      ],
      hay_mas: false,
    })
    expect(pagina?.filas[0]).toMatchObject({
      clase: 'recordatorio',
      instante: '2026-11-17T14:00:00+00:00',
      orden: '2026-11-17T14:00:00+00:00',
    })
    expect(pagina?.hayMas).toBe(false)
  })

  it('sin fecha: sin instante, con el alta como cursor', () => {
    const pagina = paginaDePendientes('sin_fecha', {
      tareas: [
        {
          id: ID_A,
          titulo: 'Pedir',
          estado: 'pendiente',
          creado_en: '2026-11-10T14:00:00.5+00:00',
          actualizado_en: VERSION,
          mia: true,
        },
      ],
      hay_mas: false,
    })
    expect(pagina?.filas[0]).toMatchObject({
      clase: 'tarea',
      instante: null,
      orden: '2026-11-10T14:00:00.5+00:00',
      actualizadoEn: VERSION,
    })
  })

  it('una forma ajena da nulo', () => {
    expect(paginaDePendientes('vencidas', null)).toBeNull()
    expect(paginaDePendientes('vencidas', { filas: [{ id: ID_A }], hay_mas: false })).toBeNull()
    expect(paginaDePendientes('recordatorios', { filas: [] })).toBeNull()
    expect(paginaDePendientes('sin_fecha', { filas: [], hay_mas: false })).toBeNull()
  })
})

describe('cursorDePendientes', () => {
  it('es el (orden, id) de la última; sin nada cargado no hay cursor', () => {
    const pagina = paginaDePendientes('vencidas', {
      filas: [
        { id: ID_A, titulo: 'a', vence_en: '2026-11-14T10:00:00+00:00', actualizado_en: VERSION },
        {
          id: ID_B,
          titulo: 'b',
          vence_en: '2026-11-15T10:00:00.25+00:00',
          actualizado_en: VERSION,
        },
      ],
      hay_mas: true,
    })
    expect(cursorDePendientes(pagina?.filas ?? [])).toEqual({
      en: '2026-11-15T10:00:00.25+00:00',
      id: ID_B,
    })
    expect(cursorDePendientes([])).toBeNull()
  })
})

describe('cuandoDelPendiente', () => {
  const ahora = '2026-11-17T16:00:00Z' // 12:00 en La Paz

  it('vencidas: «Vencida» con la fecha y la hora de la empresa', () => {
    expect(cuandoDelPendiente('vencidas', '2026-11-15T22:00:00Z', { ahora, zona: ZONA })).toEqual({
      texto: 'Vencida · 15 nov 2026, 18:00',
      vencido: true,
    })
  })

  it('recordatorios: «Vencido» si ya pasó; «Hoy» con la hora si es más tarde', () => {
    expect(
      cuandoDelPendiente('recordatorios', '2026-11-17T13:00:00Z', { ahora, zona: ZONA }),
    ).toEqual({
      texto: 'Vencido · 17 nov 2026, 09:00',
      vencido: true,
    })
    expect(
      cuandoDelPendiente('recordatorios', '2026-11-17T19:00:00Z', { ahora, zona: ZONA }),
    ).toEqual({
      texto: 'Hoy 15:00',
      vencido: false,
    })
  })

  it('sin fecha no dice nada', () => {
    expect(cuandoDelPendiente('sin_fecha', null, { ahora, zona: ZONA })).toBeNull()
  })
})

describe('textoDelTopeDePendientes', () => {
  it('sin fecha: las más recientes; los otros: los más antiguos', () => {
    expect(textoDelTopeDePendientes('sin_fecha', 500)).toBe('Mostrando las 500 más recientes.')
    expect(textoDelTopeDePendientes('vencidas', 500)).toBe('Mostrando los 500 más antiguos.')
  })
})
