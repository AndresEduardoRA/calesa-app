// «Una abierta por lead y embudo»: la guarda toma un candado de transacción por (lead, embudo) antes de mirar. Hoy sus llamadoras ya tienen el
// lead con `for update`, que serializa igual, así que ninguna carrera de `scripts/carreras/oportunidades.mjs` cae si el candado se pierde: esta
// prueba de definición lo fija (docs/LECCIONES.md › RPC), y también que crear, mover y restaurar pasen por la guarda.
import { describe, expect, it } from 'vitest'
import { definicionSql } from '../lib/definicion-sql'

describe('_oportunidad_abierta_unica', () => {
  it('toma el candado por (lead, embudo) antes de buscar otra abierta', () => {
    const { texto } = definicionSql('_oportunidad_abierta_unica')
    const candado = texto.search(/pg_advisory_xact_lock\(hashtextextended\('oportunidad_abierta:'/)
    expect(candado).toBeGreaterThan(-1)
    expect(texto.indexOf('from public.oportunidades')).toBeGreaterThan(candado)
  })

  it('la llaman crear, mover (al reabrir) y restaurar', () => {
    for (const funcion of ['oportunidad_crear', 'oportunidad_mover', 'oportunidad_restaurar']) {
      expect(definicionSql(funcion).texto).toContain('public._oportunidad_abierta_unica(')
    }
  })
})
