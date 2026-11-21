import { describe, expect, it } from 'vitest'
import type { Nodo } from '../nodos'
import { validarFormula } from '../validar'
import { FORMULA_BANDAS as F } from './bandas.soporte'
import { grupoDelRechazo } from './grupos'
import { paramsParaValidar } from './params-para-validar'

// `ga` (bucket `a`) con Cinco y Uno, `gb` (bucket `b`) con Dos (`bandas.soporte.ts`).
describe('grupoDelRechazo', () => {
  it('T6: da el grupo de `grupo_vacio` y de `bucket_inexistente`; nulo para una fila o una auxiliar', () => {
    const grupos = F.definicion.grupos ?? []
    const nodos = F.definicion.nodos.map((n) =>
      n.id === 'dos' ? ({ ...n, grupo: undefined } as Nodo) : n,
    )
    const v = validarFormula({ ...F.definicion, nodos }, paramsParaValidar(F))
    expect(v.ok).toBe(false)
    if (!v.ok) {
      expect(v.error.regla).toBe('grupo_vacio')
      expect(grupoDelRechazo(v.error, grupos)).toBe('gb')
    }
    const sinBucket = validarFormula(
      {
        ...F.definicion,
        grupos: grupos.map((g) => (g.id === 'ga' ? { ...g, bucket: 'c' } : g)),
      },
      paramsParaValidar(F),
    )
    expect(sinBucket.ok).toBe(false)
    if (!sinBucket.ok) {
      expect(sinBucket.error.regla).toBe('bucket_inexistente')
      expect(grupoDelRechazo(sinBucket.error, grupos)).toBe('ga')
    }
    expect(grupoDelRechazo({ donde: 'cinco' }, grupos)).toBeNull()
    expect(grupoDelRechazo({ donde: 'dos__1' }, grupos)).toBeNull()
    expect(grupoDelRechazo({}, grupos)).toBeNull()
  })
})
