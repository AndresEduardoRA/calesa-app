import { describe, expect, it } from 'vitest'
import type { AvisoDeRevision } from './avisos'
import { marcasDeRevision } from './marcas'

const G = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const flujo = {
  fases: [
    { id: G(1), activa: true },
    { id: G(2), activa: false },
    { id: G(3), activa: true },
  ],
  transiciones: [
    { id: G(11), deFaseId: G(1), aFaseId: G(2) },
    { id: G(12), deFaseId: G(1), aFaseId: G(3) },
  ],
} as unknown as Parameters<typeof marcasDeRevision>[1]
const aviso = (extra: Partial<AvisoDeRevision>): AvisoDeRevision => ({
  nivel: 'aviso',
  codigo: 'sin_salida',
  mensaje: 'La fase no tiene salida.',
  faseId: G(3),
  ...extra,
})

describe('marcasDeRevision', () => {
  it('un aviso con fase va a su fase; sin fase, o de una que no se leyó, es del flujo', () => {
    const marcas = marcasDeRevision(
      [
        aviso({}),
        aviso({ nivel: 'error', codigo: 'sin_inicial', faseId: null, mensaje: 'Sin inicial.' }),
        aviso({ faseId: G(99), mensaje: 'De una fase cortada.' }),
      ],
      flujo,
    )
    expect(marcas.porFase.get(G(3))).toEqual([
      { nivel: 'aviso', mensaje: 'La fase no tiene salida.' },
    ])
    expect(marcas.delFlujo.map((m) => m.mensaje)).toEqual(['Sin inicial.', 'De una fase cortada.'])
    expect(marcas.estado).toBe('leido')
  })

  it('«salida a jubilada» marca su fase y las salidas de esa fase hacia jubiladas', () => {
    const marcas = marcasDeRevision([aviso({ codigo: 'salida_a_jubilada', faseId: G(1) })], flujo)
    expect(marcas.porFase.has(G(1))).toBe(true)
    expect([...marcas.porSalida.keys()]).toEqual([G(11)])
  })

  it('«rol sin personas» queda en la fase (no se sabe de qué salida es) y la información se conserva', () => {
    const marcas = marcasDeRevision(
      [
        aviso({ codigo: 'rol_sin_personas', faseId: G(1) }),
        aviso({ nivel: 'info', codigo: 'sin_bloqueantes', faseId: G(1) }),
      ],
      flujo,
    )
    expect(marcas.porFase.get(G(1))?.map((m) => m.nivel)).toEqual(['aviso', 'info'])
    expect(marcas.porSalida.size).toBe(0)
  })
})
