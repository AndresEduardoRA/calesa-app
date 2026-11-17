import { describe, expect, it } from 'vitest'
import { etiquetaDeLead } from './estado-de-elegir-lead'

describe('etiquetaDeLead', () => {
  it('el nombre, o el número, o «Sin nombre»', () => {
    expect(etiquetaDeLead({ nombre: ' Ana Rojas ', numero_visible: 3 })).toBe('Ana Rojas')
    expect(etiquetaDeLead({ nombre: '  ', numero_visible: 3 })).toBe('Lead #3')
    expect(etiquetaDeLead({ nombre: null, numero_visible: null })).toBe('Sin nombre')
  })
})
