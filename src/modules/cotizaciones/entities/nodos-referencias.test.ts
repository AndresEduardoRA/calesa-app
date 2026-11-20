import { describe, expect, it } from 'vitest'
import { CASOS, nodo } from './nodos.soporte'
import { referenciasDe } from './nodos-referencias'

describe('referenciasDe', () => {
  it.each(CASOS)('%s nombra lo que lee, con su papel', (_, crudo, esperadas) => {
    expect(referenciasDe(nodo(crudo)).map((r) => `${r.papel}:${r.id}`)).toEqual(esperadas)
  })
})
