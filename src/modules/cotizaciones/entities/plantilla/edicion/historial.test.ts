import { describe, expect, it } from 'vitest'
import {
  TOPE_DEL_HISTORIAL,
  cortar,
  deshacer,
  historialNuevo,
  loQueSeDeshace,
  loQueSeRehace,
  registrar,
  rehacer,
} from './historial'

describe('el historial del editor', () => {
  it('deshacer vuelve al estado de antes y rehacer lo trae de nuevo, con el nombre del paso', () => {
    let h = registrar(historialNuevo<number>(), 0, 'combinar')
    h = registrar(h, 1, 'insertar una fila')
    expect(loQueSeDeshace(h)).toBe('insertar una fila')
    const uno = deshacer(h, 2)
    expect(uno).toMatchObject({ estado: 1, nombre: 'insertar una fila' })
    if (uno === null) throw new Error('sin vuelta')
    expect(loQueSeRehace(uno.historial)).toBe('insertar una fila')
    const dos = rehacer(uno.historial, 1)
    expect(dos).toMatchObject({ estado: 2, nombre: 'insertar una fila' })
    expect(deshacer(historialNuevo<number>(), 0)).toBeNull()
    expect(rehacer(h, 2)).toBeNull()
  })

  it('un paso nuevo tras deshacer borra lo que se podía rehacer', () => {
    const h = registrar(historialNuevo<number>(), 0, 'a')
    const vuelta = deshacer(h, 1)
    if (vuelta === null) throw new Error('sin vuelta')
    expect(registrar(vuelta.historial, 0, 'b').adelante).toEqual([])
  })

  it('guarda a lo sumo 100 pasos y olvida el más viejo', () => {
    let h = historialNuevo<number>()
    for (let i = 0; i < TOPE_DEL_HISTORIAL + 5; i++) h = registrar(h, i, `paso ${String(i)}`)
    expect(h.atras).toHaveLength(TOPE_DEL_HISTORIAL)
    expect(h.atras[0]?.estado).toBe(5)
  })

  it('lo escrito en un campo se junta por clave hasta que cambia la selección', () => {
    let h = registrar(historialNuevo<string>(), '', 'escribir', { clave: 'texto:c1' })
    h = registrar(h, 'H', 'escribir', { clave: 'texto:c1' })
    h = registrar(h, 'Ho', 'escribir', { clave: 'texto:c1' })
    expect(h.atras).toHaveLength(1)
    expect(deshacer(h, 'Hol')?.estado).toBe('')
    // Otra clave, otro paso.
    expect(registrar(h, 'Hol', 'ancho', { clave: 'ancho:k1' }).atras).toHaveLength(2)
    // Tras un corte, la misma clave es otro paso.
    expect(registrar(cortar(h), 'Hol', 'escribir', { clave: 'texto:c1' }).atras).toHaveLength(2)
    // Un paso sin clave no se junta con nada.
    expect(
      registrar(registrar(h, 'x', 'combinar'), 'y', 'escribir', { clave: 'texto:c1' }).atras,
    ).toHaveLength(3)
  })
})
