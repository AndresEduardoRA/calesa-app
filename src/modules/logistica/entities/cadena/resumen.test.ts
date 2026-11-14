import { describe, expect, it } from 'vitest'
import {
  cadenaSinVehiculos,
  cifraDeLaFase,
  etiquetaDeLaFase,
  maximoDeLaCadena,
  nombreDeLaFase,
  proporcionDeLaBarra,
  proporcionDelTramo,
  resumenDesde,
  textoDeDemorados,
  textoDeTrabados,
  type FaseDelResumen,
} from './resumen'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

const fila = (extra: Record<string, unknown> = {}) => ({
  fase_id: A,
  nombre: 'Tránsito',
  color: '#00aaff',
  orden: 20,
  activa: true,
  es_final: false,
  demora_dias: 10,
  vehiculos: { n: 340, hay_mas: false },
  demorados: { n: 12, hay_mas: false },
  trabados: { n: 3, hay_mas: false },
  ...extra,
})

const fase = (extra: Partial<FaseDelResumen> = {}): FaseDelResumen => ({
  faseId: A,
  nombre: 'Tránsito',
  color: '#00aaff',
  orden: 20,
  activa: true,
  esFinal: false,
  demoraDias: 10,
  vehiculos: { n: 340, hayMas: false },
  demorados: { n: 12, hayMas: false },
  trabados: { n: 3, hayMas: false },
  ...extra,
})

describe('resumenDesde', () => {
  it('lee las fases en el orden que dio la base, con «Sin fase» de fase_id nulo', () => {
    const leido = resumenDesde({
      fases: [
        fila({
          fase_id: null,
          nombre: null,
          color: null,
          orden: null,
          activa: null,
          demora_dias: null,
          demorados: null,
          trabados: null,
        }),
        fila(),
        fila({ fase_id: B, vehiculos: { n: 1000, hay_mas: true } }),
      ],
    })
    expect(leido.ok).toBe(true)
    if (!leido.ok) return
    expect(leido.data.fases.map((f) => f.faseId)).toEqual([null, A, B])
    expect(leido.data.fases[0]?.demorados).toBeNull()
    expect(leido.data.fases[1]?.trabados).toEqual({ n: 3, hayMas: false })
    expect(leido.data.fases[2]?.vehiculos).toEqual({ n: 1000, hayMas: true })
  })

  it('sin fases es un resumen vacío válido', () => {
    expect(resumenDesde({ fases: [] })).toEqual({ ok: true, data: { fases: [] } })
  })

  it('una forma ajena es «inesperado», nunca una fase cortada', () => {
    for (const mala of [
      null,
      {},
      { fases: 'x' },
      { fases: [fila({ fase_id: 'no-es-un-guid' })] },
      { fases: [fila({ vehiculos: { n: -1, hay_mas: false } })] },
      { fases: [fila({ vehiculos: { n: 1.5, hay_mas: false } })] },
      { fases: [fila({ es_final: 'si' })] },
      { fases: [fila({ trabados: { n: 1 } })] },
    ]) {
      const leido = resumenDesde(mala)
      expect(leido.ok).toBe(false)
    }
  })
})

describe('las barras', () => {
  it('proporciona contra el máximo de la cadena', () => {
    const resumen = {
      fases: [
        fase({ vehiculos: { n: 100, hayMas: false } }),
        fase({ vehiculos: { n: 25, hayMas: false } }),
      ],
    }
    expect(maximoDeLaCadena(resumen)).toBe(100)
    expect(proporcionDeLaBarra(25, 100)).toBe(0.25)
    expect(proporcionDeLaBarra(100, 100)).toBe(1)
  })

  it('una fase con vehículos nunca queda en cero y una vacía sí', () => {
    expect(proporcionDeLaBarra(1, 1000)).toBe(0.02)
    expect(proporcionDeLaBarra(0, 1000)).toBe(0)
    expect(proporcionDeLaBarra(5, 0)).toBe(0)
  })

  it('un tramo es parte de la barra de su fase y no pasa de ella', () => {
    expect(proporcionDelTramo(12, 48)).toBe(0.25)
    expect(proporcionDelTramo(60, 48)).toBe(1)
    expect(proporcionDelTramo(0, 48)).toBe(0)
    expect(proporcionDelTramo(3, 0)).toBe(0)
  })

  it('el máximo de una cadena vacía es cero', () => {
    expect(maximoDeLaCadena({ fases: [] })).toBe(0)
  })
})

describe('los textos', () => {
  it('demorados y trabados dicen la cifra con texto y callan con cero o sin regla', () => {
    expect(textoDeDemorados({ n: 12, hayMas: false })).toBe('12 demorados')
    expect(textoDeDemorados({ n: 1, hayMas: false })).toBe('1 demorado')
    expect(textoDeDemorados({ n: 1000, hayMas: true })).toBe('1.000+ demorados')
    expect(textoDeDemorados({ n: 0, hayMas: false })).toBeNull()
    expect(textoDeDemorados(null)).toBeNull()
    expect(textoDeTrabados({ n: 3, hayMas: false })).toBe('3 trabados')
    expect(textoDeTrabados({ n: 1, hayMas: false })).toBe('1 trabado')
    expect(textoDeTrabados({ n: 3, hayMas: true })).toBe('3+ trabados')
    expect(textoDeTrabados({ n: 0, hayMas: false })).toBeNull()
    expect(textoDeTrabados(null)).toBeNull()
  })

  it('la cifra de una fase nunca es un total exacto cuando hay más que el tope', () => {
    expect(cifraDeLaFase(fase())).toBe('340')
    expect(cifraDeLaFase(fase({ vehiculos: { n: 1000, hayMas: true } }))).toBe('1.000+')
  })

  it('la etiqueta para el lector de pantalla junta el nombre y las cifras', () => {
    expect(etiquetaDeLaFase(fase())).toBe('Tránsito: 340 vehículos, 12 demorados, 3 trabados')
    expect(
      etiquetaDeLaFase(
        fase({
          vehiculos: { n: 1, hayMas: false },
          demorados: { n: 1, hayMas: false },
          trabados: null,
        }),
      ),
    ).toBe('Tránsito: 1 vehículo, 1 demorado')
    expect(
      etiquetaDeLaFase(
        fase({
          nombre: null,
          faseId: null,
          vehiculos: { n: 0, hayMas: false },
          demorados: null,
          trabados: null,
        }),
      ),
    ).toBe('Sin fase: 0 vehículos')
  })

  it('«Sin fase» es el nombre de la fase sin nombre', () => {
    expect(nombreDeLaFase({ nombre: null })).toBe('Sin fase')
    expect(nombreDeLaFase({ nombre: 'Aduana' })).toBe('Aduana')
  })
})

describe('cadenaSinVehiculos', () => {
  it('es cierta sólo si ninguna fase tiene vehículos', () => {
    const vacia = fase({ vehiculos: { n: 0, hayMas: false } })
    expect(cadenaSinVehiculos({ fases: [vacia, vacia] })).toBe(true)
    expect(cadenaSinVehiculos({ fases: [vacia, fase()] })).toBe(false)
    expect(cadenaSinVehiculos({ fases: [] })).toBe(true)
  })
})
