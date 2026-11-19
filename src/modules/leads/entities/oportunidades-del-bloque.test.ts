import { describe, expect, it } from 'vitest'
import { rutaDelEmbudoDelLead } from './embudo-del-lead'
import type { EstadoDeOportunidad } from './oportunidad'
import { OPORTUNIDADES_A_LA_VISTA, oportunidadesDelBloque } from './oportunidades-del-bloque'

const LEAD = '00000000-0000-4000-8000-0000000000aa'
const POR_DEFECTO = '00000000-0000-4000-8000-0000000000e1'
const OTRO = '00000000-0000-4000-8000-0000000000e2'
const embudos = [
  { id: OTRO, esDefault: false },
  { id: POR_DEFECTO, esDefault: true },
]
const una = (n: number, estado: EstadoDeOportunidad, embudoId = POR_DEFECTO) => ({
  id: String(n),
  estado,
  embudoId,
})
const bloque = (lista: ReturnType<typeof una>[], hayMas = false, conEmbudos = embudos) =>
  oportunidadesDelBloque({ lista, hayMas, embudos: conEmbudos, leadId: LEAD })

describe('oportunidadesDelBloque', () => {
  it('sin oportunidades: nada a la vista y sin «Ver todas»', () => {
    expect(bloque([])).toEqual({ aLaVista: [], verTodas: null })
  })

  it('sólo cerradas: nada a la vista y «Ver todas» al embudo por defecto', () => {
    const { aLaVista, verTodas } = bloque([una(1, 'ganada', OTRO), una(2, 'perdida', OTRO)])
    expect(aLaVista).toEqual([])
    expect(verTodas).toBe(rutaDelEmbudoDelLead(POR_DEFECTO, LEAD))
  })

  it('dos abiertas y cerradas: las dos abiertas y «Ver todas» al embudo de la primera', () => {
    const { aLaVista, verTodas } = bloque([
      una(1, 'abierta', OTRO),
      una(2, 'abierta'),
      una(3, 'ganada'),
    ])
    expect(aLaVista.map((o) => o.id)).toEqual(['1', '2'])
    expect(verTodas).toBe(rutaDelEmbudoDelLead(OTRO, LEAD))
  })

  it('sólo abiertas que caben: sin «Ver todas»', () => {
    expect(bloque([una(1, 'abierta'), una(2, 'abierta', OTRO)]).verTodas).toBeNull()
  })

  it('cinco abiertas: las primeras tres, en el orden de la base, y «Ver todas»', () => {
    const lista = [1, 2, 3, 4, 5].map((n) => una(n, 'abierta'))
    const { aLaVista, verTodas } = bloque(lista)
    expect(aLaVista).toHaveLength(OPORTUNIDADES_A_LA_VISTA)
    expect(aLaVista.map((o) => o.id)).toEqual(['1', '2', '3'])
    expect(verTodas).toBe(rutaDelEmbudoDelLead(POR_DEFECTO, LEAD))
  })

  it('con más por leer (`hayMas`) también hay «Ver todas»', () => {
    expect(bloque([una(1, 'abierta')], true).verTodas).toBe(rutaDelEmbudoDelLead(POR_DEFECTO, LEAD))
  })

  it('sin embudo por defecto ni abiertas: la ruta sin embudo (la vista elige)', () => {
    expect(bloque([una(1, 'cancelada')], false, [{ id: OTRO, esDefault: false }]).verTodas).toBe(
      rutaDelEmbudoDelLead(null, LEAD),
    )
  })
})
