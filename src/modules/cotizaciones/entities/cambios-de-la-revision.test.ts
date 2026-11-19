import { describe, expect, it } from 'vitest'
import { cambiosDeLaRevision } from './cambios-de-la-revision'

const etiquetas = new Map([
  ['pub', 'Precio publicado'],
  ['fob', 'FOB'],
  ['flete', 'Flete'],
  ['seguro', 'Seguro'],
  ['zeta', 'Zeta'],
])

const cambios = (diff: Record<string, unknown>) => cambiosDeLaRevision(diff, etiquetas)

describe('cambiosDeLaRevision: qué cambió en una revisión', () => {
  it('nombra los nodos de valores y de fuentes sin repetir, por etiqueta', () => {
    const r = cambios({
      valores: { de: { pub: 1, fob: 2 }, a: { pub: 3, fob: 4 } },
      fuentes: { de: { fob: 'a' }, a: { fob: 'b', flete: 'c' } },
    })
    expect(r.vistos).toEqual(['Cambió «Flete»', 'Cambió «FOB»', 'Cambió «Precio publicado»'])
    expect(r.masN).toBe(0)
  })

  it('un nodo que sólo cambió su fuente también se nombra', () => {
    const r = cambios({ fuentes: { de: { fob: 'a' }, a: { fob: 'b' } } })
    expect(r.vistos).toEqual(['Cambió «FOB»'])
  })

  it('sin etiqueta, el id', () => {
    expect(cambios({ valores: { de: { raro: 1 }, a: { raro: 2 } } }).vistos).toEqual([
      'Cambió «raro»',
    ])
  })

  it('a la vista las primeras 3 y «y N más» con el resto', () => {
    const r = cambios({
      valores: { de: { pub: 1, fob: 2, flete: 3, seguro: 4, zeta: 5 }, a: {} },
    })
    expect(r.vistos).toHaveLength(3)
    expect(r.masN).toBe(2)
  })

  it('las columnas que se nombran, cada una con su texto', () => {
    const texto = (diff: Record<string, unknown>) => cambios(diff).vistos
    expect(texto({ clase: { de: 'preventa', a: 'final' } })).toEqual(['Pasó a final'])
    expect(texto({ clase: { de: 'final', a: 'preventa' } })).toEqual(['Volvió a preventa'])
    expect(texto({ modo_tc: { de: 'a', a: 'b' } })).toEqual(['Cambió el modo de tipo de cambio'])
    expect(texto({ ver_total_bs: { de: false, a: true } })).toEqual(['Encendió «Ver total Bs»'])
    expect(texto({ ver_total_bs: { de: true, a: false } })).toEqual(['Apagó «Ver total Bs»'])
    expect(texto({ vehiculo_id: { de: 'x', a: 'y' } })).toEqual(['Cambió el vehículo'])
    expect(texto({ lead_id: { de: null, a: 'y' } })).toEqual(['Cambió el cliente'])
    expect(texto({ titulo: { de: 'a', a: 'b' } })).toEqual(['Cambió el título'])
    expect(texto({ notas: { de: 'a', a: 'b' } })).toEqual(['Cambió las notas'])
    expect(texto({ tipos_cambio: { de: {}, a: {} } })).toEqual(['Cambió un tipo de cambio'])
    expect(texto({ eliminado_en: { de: null, a: '2026-11-01T00:00:00Z' } })).toEqual([
      'Fue a la papelera',
    ])
    expect(texto({ eliminado_en: { de: '2026-11-01T00:00:00Z', a: null } })).toEqual([
      'Volvió de la papelera',
    ])
  })

  it('total_base y las demás columnas no se nombran', () => {
    const r = cambios({
      total_base: { de: 1, a: 2 },
      formula_id: { de: 'a', a: 'b' },
      estado: { de: 'x', a: 'y' },
      plantilla_id: { de: null, a: 'z' },
      moneda_mostrar: { de: 'USD', a: 'BOB' },
    })
    expect(r.vistos).toEqual([])
    expect(r.sinCambios).toBe(true)
  })

  it('sin nada que nombrar ni total: sin cambios que se puedan ver', () => {
    expect(cambios({}).sinCambios).toBe(true)
    expect(cambios({ totales: { de: { grupos: {} }, a: { grupos: {} } } }).sinCambios).toBe(true)
  })

  it('el total sólo con dos números', () => {
    expect(cambios({ totales: { de: { usd: 105 }, a: { usd: 110 } } }).total).toEqual({
      de: 105,
      a: 110,
    })
    expect(cambios({ totales: { de: { usd: 105 }, a: {} } }).total).toBeNull()
    expect(cambios({ totales: { de: { usd: null }, a: { usd: 110 } } }).total).toBeNull()
    expect(cambios({ totales: { de: { usd: '105' }, a: { usd: 110 } } }).total).toBeNull()
  })

  it('con el total y sin más, no está «sin cambios»', () => {
    const r = cambios({ totales: { de: { usd: 1 }, a: { usd: 2 } } })
    expect(r.vistos).toEqual([])
    expect(r.sinCambios).toBe(false)
  })

  it('un diff que no es un objeto no rompe', () => {
    expect(
      cambiosDeLaRevision({ valores: 3, fuentes: { de: 1, a: null } }, etiquetas).sinCambios,
    ).toBe(true)
  })
})

describe('cambiosDeLaRevision › el título de la cotización (T307)', () => {
  it('los retoques de la tarjeta: «Retocó la tarjeta», también al volver a la plantilla (a nulo)', () => {
    const texto = (diff: Record<string, unknown>) => cambiosDeLaRevision(diff, new Map()).vistos
    expect(texto({ tarjeta_retoques: { de: null, a: { celdas: 1, filas_ocultas: 0 } } })).toEqual([
      'Retocó la tarjeta',
    ])
    expect(texto({ tarjeta_retoques: { de: { celdas: 2, filas_ocultas: 1 }, a: null } })).toEqual([
      'Retocó la tarjeta',
    ])
    expect(
      cambiosDeLaRevision({ tarjeta_retoques: { de: null, a: null } }, new Map()).sinCambios,
    ).toBe(false)
  })

  it('pasar de automático a manual, solo o junto al texto, se dice una vez', () => {
    const texto = (diff: Record<string, unknown>) => cambiosDeLaRevision(diff, new Map()).vistos
    expect(texto({ titulo_manual: { de: false, a: true } })).toEqual(['Cambió el título'])
    expect(texto({ titulo: { de: 'a', a: 'b' }, titulo_manual: { de: true, a: false } })).toEqual([
      'Cambió el título',
    ])
  })
})

describe('cambiosDeLaRevision › el cambio de vehículo con sus nombres (T315)', () => {
  const diff = {
    vehiculo_id: { de: 'a', a: 'b' },
    valores: { de: { pub: 1, fob: 2, flete: 3 }, a: { pub: 4, fob: 5, flete: 6 } },
  }

  it('con los dos nombrados: «Cambió el vehículo: A → B», primero y en lugar de «Cambió el vehículo»', () => {
    const r = cambiosDeLaRevision(diff, etiquetas, {
      de: { titulo: 'Toyota Corolla' },
      a: { titulo: 'Mazda 3' },
    })
    expect(r.vistos[0]).toBe('Cambió el vehículo: Toyota Corolla → Mazda 3')
    expect(r.vistos).not.toContain('Cambió el vehículo')
    expect(r.masN).toBe(1)
  })

  it('un lado que quien mira no ve: «un vehículo que no puedes ver»', () => {
    const r = cambiosDeLaRevision(diff, etiquetas, { de: 'oculto', a: { titulo: 'Mazda 3' } })
    expect(r.vistos[0]).toBe('Cambió el vehículo: un vehículo que no puedes ver → Mazda 3')
  })

  it('sin vehículo antes: «sin vehículo»', () => {
    const r = cambiosDeLaRevision({ vehiculo_id: { de: null, a: 'b' } }, etiquetas, {
      de: 'sin',
      a: { titulo: 'Mazda 3' },
    })
    expect(r.vistos).toEqual(['Cambió el vehículo: sin vehículo → Mazda 3'])
  })

  it('sin la lectura de los nombres: «Cambió el vehículo», después de los nodos', () => {
    const r = cambiosDeLaRevision(
      { vehiculo_id: { de: 'a', a: 'b' }, valores: diff.valores },
      etiquetas,
    )
    expect(r.vistos).toEqual(['Cambió «Flete»', 'Cambió «FOB»', 'Cambió «Precio publicado»'])
    expect(r.masN).toBe(1)
    expect(cambiosDeLaRevision({ vehiculo_id: { de: 'a', a: 'b' } }, etiquetas).vistos).toEqual([
      'Cambió el vehículo',
    ])
  })
})
