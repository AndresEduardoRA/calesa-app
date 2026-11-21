import { describe, expect, it } from 'vitest'
import { CLAVE_DE_LA_FILA_PEDIDA, CLAVE_DEL_LUGAR_PEDIDO } from './llegada-al-editor'

describe('la llegada al editor de una fórmula', () => {
  it('la fila y el lugar van en claves distintas de la URL', () => {
    expect(CLAVE_DE_LA_FILA_PEDIDA).toBe('fila')
    expect(CLAVE_DEL_LUGAR_PEDIDO).toBe('lugar')
  })
})
