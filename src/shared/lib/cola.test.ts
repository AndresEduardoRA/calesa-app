import { describe, expect, it } from 'vitest'
import { crearCola, type TurnoDeLaCola } from './cola'

// `n` pedidos a una cola de `maximo`, con el orden en que les tocó (las promesas se cumplen en un microtask: `esperar()` antes de mirar).
function pedidos(maximo: number, n: number) {
  const cola = crearCola(maximo)
  const tocaron: number[] = []
  const turnos: TurnoDeLaCola[] = Array.from({ length: n }, (_, i) => {
    const pedido = cola.pedir()
    void pedido.turno.then(() => tocaron.push(i))
    return pedido
  })
  const soltar = (i: number) => {
    turnos[i]?.soltar()
  }
  return { tocaron, soltar }
}

const esperar = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('crearCola', () => {
  it('no da más de `maximo` turnos a la vez', async () => {
    const { tocaron } = pedidos(2, 4)
    await esperar()
    expect(tocaron).toEqual([0, 1])
  })

  it('al soltar uno, le toca al siguiente en el orden en que se pidieron', async () => {
    const { tocaron, soltar } = pedidos(2, 4)
    soltar(1)
    await esperar()
    expect(tocaron).toEqual([0, 1, 2])
    soltar(0)
    await esperar()
    expect(tocaron).toEqual([0, 1, 2, 3])
  })

  it('soltar antes del turno deja la fila sin ocupar un lugar', async () => {
    const { tocaron, soltar } = pedidos(1, 3)
    soltar(1)
    soltar(0)
    await esperar()
    expect(tocaron).toEqual([0, 2])
  })

  it('soltar dos veces no libera dos lugares', async () => {
    const { tocaron, soltar } = pedidos(1, 3)
    soltar(0)
    soltar(0)
    await esperar()
    expect(tocaron).toEqual([0, 1])
  })
})
