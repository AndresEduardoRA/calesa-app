import { describe, expect, it } from 'vitest'
import {
  anuncioDe,
  celda,
  celdaPorId,
  grilla,
  ocupante,
  plantillaDe,
  rect,
  texto,
} from './edicion.soporte'
import { estiloComun, estiloConCambio, ponerEstilo } from './estilo'

const P = grilla(2, 3, [
  { ...celda('a', 0, 0, texto('A')), estilo: { negrita: true, fondo: 'verde' } },
  celda('b', 0, 1, texto('B')),
])

describe('ponerEstilo', () => {
  it('lo mezcla en las celdas y las casillas vacías reciben una celda vacía con ese formato', () => {
    const r = ponerEstilo(P, rect(0, 0, 0, 2), { cursiva: true })
    const p = plantillaDe(r)
    expect(anuncioDe(r)).toBe('Se cambió el formato de 3 celdas.')
    expect(celdaPorId(p, 'a')?.estilo).toEqual({ negrita: true, fondo: 'verde', cursiva: true })
    expect(celdaPorId(p, 'b')?.estilo).toEqual({ cursiva: true })
    expect(celdaPorId(p, ocupante(p, 0, 2) ?? '')).toMatchObject({
      contenido: { tipo: 'vacio' },
      estilo: { cursiva: true },
    })
  })
  it('el valor por omisión quita la clave y un estilo vacío se quita', () => {
    const p = plantillaDe(ponerEstilo(P, rect(0, 0), { negrita: false, fondo: 'auto' }))
    expect(celdaPorId(p, 'a')).not.toHaveProperty('estilo')
    expect(estiloConCambio({ tamano: 14 }, { tamano: 12 })).toBeUndefined()
    expect(
      estiloConCambio(undefined, { alinear: 'izquierda', alinear_vertical: 'centro' }),
    ).toBeUndefined()
  })
  it('volver al de por omisión no crea celdas en las casillas vacías; lo mismo, no cambia nada', () => {
    const r = ponerEstilo(P, rect(1, 0, 1, 2), { negrita: false })
    expect(r.ok && r.plantilla).toBe(P)
    expect(anuncioDe(ponerEstilo(P, rect(0, 0), { negrita: true }))).toBe('El formato ya era ese.')
  })
  it('bordes: todos, un lado, ninguno', () => {
    expect(estiloConCambio(undefined, { borde: { lado: 'todos', borde: 'fino' } })).toEqual({
      bordes: { todos: 'fino' },
    })
    expect(
      estiloConCambio(
        { bordes: { arriba: 'grueso' } },
        { borde: { lado: 'todos', borde: 'fino' } },
      ),
    ).toEqual({ bordes: { todos: 'fino' } })
    expect(
      estiloConCambio({ bordes: { todos: 'fino' } }, { borde: { lado: 'abajo', borde: 'grueso' } }),
    ).toEqual({
      bordes: { todos: 'fino', abajo: 'grueso' },
    })
    // Un lado igual a lo que ya da `todos` no se escribe; «ninguno» sobre `todos`, sí (lo tapa).
    expect(
      estiloConCambio(
        { bordes: { todos: 'fino', abajo: 'grueso' } },
        { borde: { lado: 'abajo', borde: 'fino' } },
      ),
    ).toEqual({
      bordes: { todos: 'fino' },
    })
    expect(
      estiloConCambio(
        { bordes: { todos: 'fino' } },
        { borde: { lado: 'arriba', borde: 'ninguno' } },
      ),
    ).toEqual({
      bordes: { todos: 'fino', arriba: 'ninguno' },
    })
    expect(
      estiloConCambio(
        { bordes: { izquierda: 'fino' } },
        { borde: { lado: 'izquierda', borde: 'ninguno' } },
      ),
    ).toBeUndefined()
    expect(
      estiloConCambio(
        { bordes: { todos: 'grueso' } },
        { borde: { lado: 'todos', borde: 'ninguno' } },
      ),
    ).toBeUndefined()
  })
  it('lo que sale sigue siendo una forma 2 válida', () => {
    plantillaDe(
      ponerEstilo(P, rect(0, 0, 1, 2), {
        tamano: 22,
        alinear: 'derecha',
        borde: { lado: 'derecha', borde: 'grueso' },
      }),
    )
  })
})

describe('estiloComun', () => {
  it('lo que comparten, con su valor efectivo; lo que difiere, ausente', () => {
    const comun = estiloComun(P, rect(0, 0, 0, 1))
    expect(comun).not.toHaveProperty('negrita')
    expect(comun).not.toHaveProperty('fondo')
    expect(comun).toMatchObject({
      cursiva: false,
      tamano: 12,
      alinear: 'izquierda',
      texto: 'auto',
      bordes: { todos: 'ninguno' },
    })
    expect(estiloComun(P, rect(0, 0))).toMatchObject({ negrita: true, fondo: 'verde' })
  })
  it('los bordes por lado cuando no coinciden los cuatro', () => {
    const p = grilla(1, 2, [
      {
        ...celda('a', 0, 0, texto('A')),
        estilo: { bordes: { todos: 'fino', abajo: 'grueso' } },
      },
      { ...celda('b', 0, 1, texto('B')), estilo: { bordes: { todos: 'fino' } } },
    ])
    expect(estiloComun(p, rect(0, 0, 0, 1)).bordes).toEqual({
      arriba: 'fino',
      derecha: 'fino',
      izquierda: 'fino',
    })
  })
})
