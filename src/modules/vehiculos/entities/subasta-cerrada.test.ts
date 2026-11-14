import { describe, expect, it } from 'vitest'
import { resolverDelAviso, situacionDelAviso, subastaCerrada } from './subasta-cerrada'

const AHORA = new Date('2026-11-14T12:00:00.000Z')

describe('subastaCerrada', () => {
  it('«Sin resolver» y «No ganada» avisan', () => {
    expect(subastaCerrada({ situacion: 'sin_resolver', cierreSubastaEn: null }, AHORA)).toBe(true)
    expect(subastaCerrada({ situacion: 'no_ganada', cierreSubastaEn: null }, AHORA)).toBe(true)
  })

  it('«En subasta» avisa sólo si su cierre ya venció (la base aún no la pasó a «Sin resolver»)', () => {
    const en = (cierre: string | null) =>
      subastaCerrada({ situacion: 'en_subasta', cierreSubastaEn: cierre }, AHORA)
    expect(en('2026-11-14T11:59:59.000Z')).toBe(true)
    expect(en('2026-11-14T12:00:00.000Z')).toBe(true)
    expect(en('2026-11-14T12:00:01.000Z')).toBe(false)
    // Viva y sin fecha: no hay nada que haya pasado.
    expect(en(null)).toBe(false)
  })

  it('un vehículo en su fase (se ganó o salió del tramo) no avisa', () => {
    expect(subastaCerrada({ situacion: 'fase', cierreSubastaEn: null }, AHORA)).toBe(false)
  })
})

describe('situacionDelAviso', () => {
  it('nombra la situación real, salvo «En subasta» que la base aún no actualizó', () => {
    expect(situacionDelAviso('sin_resolver')).toBe('Sin resolver')
    expect(situacionDelAviso('no_ganada')).toBe('No ganada')
    expect(situacionDelAviso('en_subasta')).toBeNull()
  })
})

describe('resolverDelAviso', () => {
  it('ofrece «La ganamos» y «No la ganamos» sólo a quien puede y sólo sin resolver; nunca «Deshacer»', () => {
    expect(resolverDelAviso({ situacion: 'sin_resolver', puede: true })).toEqual({
      laGanamos: true,
      noLaGanamos: true,
      deshacer: false,
    })
    expect(resolverDelAviso({ situacion: 'sin_resolver', puede: false })).toEqual({
      laGanamos: false,
      noLaGanamos: false,
      deshacer: false,
    })
    expect(resolverDelAviso({ situacion: 'no_ganada', puede: true }).deshacer).toBe(false)
    expect(resolverDelAviso({ situacion: 'en_subasta', puede: true }).laGanamos).toBe(false)
  })
})
