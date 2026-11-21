import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ListaCorta, resumirLista, textoDelResto, type FilaDeListaCorta } from './lista-corta'

afterEach(cleanup)

const fila = (n: number, activo = true): FilaDeListaCorta => ({
  id: String(n),
  nombre: `Fila ${String(n)}`,
  activo,
})

describe('resumirLista', () => {
  it('toma las primeras activas en su orden y cuenta las que quedan fuera y las desactivadas', () => {
    const filas = [fila(1), fila(2, false), fila(3), fila(4), fila(5)]
    const resumen = resumirLista(filas, 2)
    expect(resumen.visibles.map((f) => f.id)).toEqual(['1', '3'])
    expect(resumen.mas).toBe(2)
    expect(resumen.desactivadas).toBe(1)
  })

  it('con menos activas que el tope no hay «más»', () => {
    expect(resumirLista([fila(1), fila(2)], 5)).toMatchObject({ mas: 0, desactivadas: 0 })
  })
})

describe('textoDelResto', () => {
  it('une lo que hay con un punto medio y calla si no hay nada', () => {
    expect(textoDelResto(3, 2)).toBe('y 3 más · 2 desactivados')
    expect(textoDelResto(3, 0)).toBe('y 3 más')
    expect(textoDelResto(0, 1)).toBe('1 desactivado')
    expect(textoDelResto(0, 0)).toBeNull()
  })
})

describe('ListaCorta', () => {
  it('dibuja las primeras activas con sus insignias y el resto', () => {
    render(
      <ListaCorta
        filas={[{ ...fila(1), insignias: ['Por defecto'] }, fila(2), fila(3), fila(4, false)]}
        tope={2}
        vacio="Nada."
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Por defecto')).toBeTruthy()
    expect(screen.getByText('y 1 más · 1 desactivado')).toBeTruthy()
  })

  it('sin filas dice el vacío', () => {
    render(<ListaCorta filas={[]} tope={5} vacio="Todavía no hay orígenes del lead." />)
    expect(screen.getByText('Todavía no hay orígenes del lead.')).toBeTruthy()
  })
})
