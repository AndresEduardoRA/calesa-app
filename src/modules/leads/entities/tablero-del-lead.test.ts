import { describe, expect, it } from 'vitest'
import type { Embudo, EtapaGuardada } from './embudo'
import { rutaDelEmbudoDelLead } from './embudo-del-lead'
import {
  OPORTUNIDADES_POR_COLUMNA,
  embudoDeLaFicha,
  etapaDeDestino,
  etapaVecina,
  tableroDelLead,
  vacioDelTablero,
} from './tablero-del-lead'

const LEAD = '00000000-0000-4000-8000-0000000000aa'
const etapa = (n: number, extra: Partial<EtapaGuardada> = {}): EtapaGuardada => ({
  id: `e${String(n)}`,
  nombre: `Etapa ${String(n)}`,
  color: 'gris',
  esInicial: n === 1,
  esGanada: false,
  esPerdida: false,
  ...extra,
})
const embudo = (id: string, esDefault: boolean): Embudo => ({
  id,
  nombre: id,
  esDefault,
  actualizadoEn: '2026-11-20T00:00:00Z',
  etapas: [etapa(1), etapa(2), etapa(3, { esGanada: true }), etapa(4, { esPerdida: true })],
})
const VENTAS = embudo('ventas', true)
const REPUESTOS = embudo('repuestos', false)
const una = (id: string, etapaId: string, embudoId = 'ventas', eliminada = false) => ({
  id,
  embudoId,
  etapaId,
  eliminada,
})

describe('embudoDeLaFicha', () => {
  const embudos = [REPUESTOS, VENTAS]
  it('lo elegido ahora manda, después lo recordado', () => {
    expect(embudoDeLaFicha(embudos, 'repuestos', 'ventas')?.id).toBe('repuestos')
    expect(embudoDeLaFicha(embudos, null, 'repuestos')?.id).toBe('repuestos')
  })
  it('un embudo que ya no es de quien mira se ignora: cae en el por defecto', () => {
    expect(embudoDeLaFicha(embudos, 'borrado', 'tampoco')?.id).toBe('ventas')
    expect(embudoDeLaFicha(embudos)?.id).toBe('ventas')
  })
  it('sin por defecto, el primero; sin embudos, nada', () => {
    expect(embudoDeLaFicha([REPUESTOS])?.id).toBe('repuestos')
    expect(embudoDeLaFicha([])).toBeNull()
  })
})

describe('tableroDelLead', () => {
  const tablero = (lista: ReturnType<typeof una>[], hayMas = false, e: Embudo = VENTAS) =>
    tableroDelLead({ lista, hayMas, embudo: e, leadId: LEAD })

  it('una columna por etapa, en el orden del embudo, con las oportunidades de la suya', () => {
    const t = tablero([una('a', 'e1'), una('b', 'e3'), una('c', 'e1', 'repuestos')])
    expect(t.columnas.map((c) => c.etapa.id)).toEqual(['e1', 'e2', 'e3', 'e4'])
    expect(t.columnas.map((c) => c.oportunidades.map((o) => o.id))).toEqual([['a'], [], ['b'], []])
    expect(t.vacio).toBe(false)
  })

  it('sin oportunidades en este embudo y nada más por leer: vacío (las de otro embudo no cuentan)', () => {
    expect(tablero([]).vacio).toBe(true)
    expect(tablero([una('x', 'e1', 'repuestos')]).vacio).toBe(true)
    expect(tablero([una('x', 'e1', 'ventas', true)]).vacio).toBe(true)
  })

  it('con más por leer no se dice vacío: lo que falta está en «Ver en el embudo»', () => {
    const t = tablero([], true)
    expect(t.vacio).toBe(false)
    expect(t.hayMasFuera).toBe(true)
  })

  it('una columna dibuja hasta el tope y dice que hay más', () => {
    const muchas = Array.from({ length: OPORTUNIDADES_POR_COLUMNA + 2 }, (_, n) =>
      una(String(n), 'e3'),
    )
    const t = tablero(muchas)
    expect(t.columnas[2]?.oportunidades).toHaveLength(OPORTUNIDADES_POR_COLUMNA)
    expect(t.columnas[2]?.hayMasAqui).toBe(true)
    expect(t.hayMasFuera).toBe(true)
    expect(tablero([una('a', 'e1')]).hayMasFuera).toBe(false)
  })

  it('«Ver en el embudo» lleva al embudo elegido filtrado por el lead', () => {
    expect(tablero([], false, REPUESTOS).verEnElEmbudo).toBe(
      rutaDelEmbudoDelLead('repuestos', LEAD),
    )
  })
})

describe('etapaDeDestino', () => {
  const etapas = VENTAS.etapas
  it('soltar sobre otra etapa de su embudo la mueve', () => {
    expect(etapaDeDestino({ etapaId: 'e1' }, etapas, 'e3')?.id).toBe('e3')
  })
  it('soltar donde estaba, fuera de toda columna o sobre algo ajeno no mueve', () => {
    expect(etapaDeDestino({ etapaId: 'e1' }, etapas, 'e1')).toBeNull()
    expect(etapaDeDestino({ etapaId: 'e1' }, etapas, null)).toBeNull()
    expect(etapaDeDestino({ etapaId: 'e1' }, etapas, 'otra')).toBeNull()
  })
})

describe('etapaVecina', () => {
  const etapas = VENTAS.etapas
  it('la de al lado en el orden del embudo; en el borde, nada', () => {
    expect(etapaVecina(etapas, 'e2', 1)?.id).toBe('e3')
    expect(etapaVecina(etapas, 'e2', -1)?.id).toBe('e1')
    expect(etapaVecina(etapas, 'e1', -1)).toBeNull()
    expect(etapaVecina(etapas, 'e4', 1)).toBeNull()
    expect(etapaVecina(etapas, 'nada', 1)).toBeNull()
  })
})

describe('vacioDelTablero', () => {
  it('nombra el embudo; sin embudo, lo dice sin nombre', () => {
    expect(vacioDelTablero('Ventas')).toBe('Sin oportunidades en «Ventas».')
    expect(vacioDelTablero(null)).toBe('Sin oportunidades.')
  })
})
