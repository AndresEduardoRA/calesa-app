import { describe, expect, it } from 'vitest'
import { CONTEXTO_DE_CONDICIONES as C } from './condiciones.soporte'
import { fraseDeLaCondicion, nombreDelDato, nombreDelNodo } from './frases-de-las-condiciones'

describe('nombreDelDato', () => {
  it('una variable por su nombre; un nodo por su etiqueta, con lo que muestra si no es su monto', () => {
    expect(nombreDelDato({ tipo: 'dato', variable: 'titulo' }, C)).toBe('Título de la cotización')
    expect(nombreDelDato({ tipo: 'dato', nodo: 'remate', mostrar: 'monto' }, C)).toBe('Remate')
    expect(nombreDelDato({ tipo: 'dato', nodo: 'remate', mostrar: 'plazo' }, C)).toBe(
      'Remate · Plazo',
    )
    expect(nombreDelNodo('borrado', C)).toBe('borrado')
  })
})

describe('fraseDeLaCondicion', () => {
  it('lo que mira, qué pregunta y su número u opción', () => {
    const frase = (c: Parameters<typeof fraseDeLaCondicion>[0]) => fraseDeLaCondicion(c, C, 'es-BO')
    expect(frase({ es: 'mayor', nodo: 'remate', a: 1000 })).toBe('Remate es mayor que 1.000')
    expect(frase({ es: 'igual', nodo: 'remate', a: 0.125 })).toBe('Remate es igual a 0,125')
    expect(frase({ es: 'cero', nodo: 'remate' })).toBe('Remate es 0')
    expect(frase({ es: 'no_vacio', dato: { tipo: 'dato', variable: 'titulo' } })).toBe(
      'Título de la cotización no está vacío',
    )
    expect(frase({ es: 'opcion', nodo: 'motor', opcion: 'diesel' })).toBe('Motor es «A diésel»')
    expect(frase({ es: 'opcion', nodo: 'motor', opcion: 'otra' })).toBe('Motor es «otra»')
    expect(frase({ es: 'apagado', nodo: 'seguro' })).toBe('Seguro está apagado')
  })
})
