import { describe, expect, it } from 'vitest'
import { destinoDeLaTecla, esTeclaQueSeEscribe } from './teclas-de-la-cuadricula'

const t = (key: string, { shift = false, ctrl = false } = {}) => ({ key, shift, ctrl })

describe('destinoDeLaTecla', () => {
  it('las flechas mueven una celda y nunca salen de la planilla', () => {
    expect(destinoDeLaTecla(t('ArrowDown'), { fila: 0, col: 2 }, 3)).toEqual({ fila: 1, col: 2 })
    expect(destinoDeLaTecla(t('ArrowUp'), { fila: 0, col: 2 }, 3)).toEqual({ fila: 0, col: 2 })
    expect(destinoDeLaTecla(t('ArrowRight'), { fila: 1, col: 3 }, 3)).toEqual({ fila: 1, col: 3 })
  })

  it('Tab recorre la fila y pasa a la siguiente; en el borde sale de la grilla', () => {
    expect(destinoDeLaTecla(t('Tab'), { fila: 0, col: 3 }, 3)).toEqual({ fila: 1, col: 0 })
    expect(destinoDeLaTecla(t('Tab'), { fila: 2, col: 3 }, 3)).toBe('salir')
    expect(destinoDeLaTecla(t('Tab', { shift: true }), { fila: 1, col: 0 }, 3)).toEqual({
      fila: 0,
      col: 3,
    })
    expect(destinoDeLaTecla(t('Tab', { shift: true }), { fila: 0, col: 0 }, 3)).toBe('salir')
  })

  it('Enter baja y Shift+Enter sube; Inicio y Fin van a A y D; con Ctrl, a la primera y la última fila', () => {
    expect(destinoDeLaTecla(t('Enter'), { fila: 1, col: 2 }, 3)).toEqual({ fila: 2, col: 2 })
    expect(destinoDeLaTecla(t('Enter', { shift: true }), { fila: 1, col: 2 }, 3)).toEqual({
      fila: 0,
      col: 2,
    })
    expect(destinoDeLaTecla(t('Home'), { fila: 1, col: 2 }, 3)).toEqual({ fila: 1, col: 0 })
    expect(destinoDeLaTecla(t('End', { ctrl: true }), { fila: 0, col: 0 }, 3)).toEqual({
      fila: 2,
      col: 3,
    })
    expect(destinoDeLaTecla(t('PageDown'), { fila: 0, col: 1 }, 3)).toEqual({ fila: 2, col: 1 })
  })

  it('otra tecla no mueve, y sin filas nada se mueve', () => {
    expect(destinoDeLaTecla(t('a'), { fila: 0, col: 0 }, 3)).toBeNull()
    expect(destinoDeLaTecla(t('ArrowDown'), { fila: 0, col: 0 }, 0)).toBeNull()
  })

  it('una tecla que se escribe es un carácter sin Ctrl, Cmd ni Alt', () => {
    const e = { ctrlKey: false, metaKey: false, altKey: false }
    expect(esTeclaQueSeEscribe({ ...e, key: '=' })).toBe(true)
    expect(esTeclaQueSeEscribe({ ...e, key: 'F2' })).toBe(false)
    expect(esTeclaQueSeEscribe({ ...e, key: 'c', ctrlKey: true })).toBe(false)
  })
})
