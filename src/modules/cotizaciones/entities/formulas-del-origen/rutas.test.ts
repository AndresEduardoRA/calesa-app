import { describe, expect, it } from 'vitest'
import * as rutas from './rutas'

describe('los nombres de la URL de la pestaña «Fórmulas»', () => {
  it('cada panel y cada clave son distintos', () => {
    const valores = Object.values(rutas)
    expect(new Set(valores).size).toBe(valores.length)
    expect(rutas.PANEL_ACTIVAR_FORMULA).toBe('activar-formula')
  })
})
