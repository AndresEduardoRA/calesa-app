import { describe, expect, it } from 'vitest'
import { hayCambiosEnElOrigen, type ValoresDeOrigen } from './use-valores-de-origen'

const GUARDADO: ValoresDeOrigen = {
  nombre: 'Corea',
  sustantivo: 'unidad',
  genero: 'f',
  color: '#027a48',
  plataformas: ['copart', 'iaai'],
}

describe('hayCambiosEnElOrigen', () => {
  it('lo mismo que lo guardado no es un cambio, aunque difiera como la base no guarda', () => {
    expect(hayCambiosEnElOrigen(GUARDADO, GUARDADO)).toBe(false)
    expect(
      hayCambiosEnElOrigen(
        {
          ...GUARDADO,
          nombre: ' Corea ',
          sustantivo: 'Unidad',
          color: '#027A48',
          plataformas: ['iaai', 'copart'],
        },
        GUARDADO,
      ),
    ).toBe(false)
  })

  it('cada dato que cambia es un cambio', () => {
    expect(hayCambiosEnElOrigen({ ...GUARDADO, nombre: 'Corea del Sur' }, GUARDADO)).toBe(true)
    expect(hayCambiosEnElOrigen({ ...GUARDADO, genero: 'm' }, GUARDADO)).toBe(true)
    expect(hayCambiosEnElOrigen({ ...GUARDADO, color: '#465fff' }, GUARDADO)).toBe(true)
    expect(hayCambiosEnElOrigen({ ...GUARDADO, plataformas: ['copart'] }, GUARDADO)).toBe(true)
  })
})
