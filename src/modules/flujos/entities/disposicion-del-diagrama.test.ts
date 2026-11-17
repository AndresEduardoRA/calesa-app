import { describe, expect, it } from 'vitest'
import {
  disponerDiagrama,
  medidasDelDiagrama,
  type FlechaDelDiagrama,
} from './disposicion-del-diagrama'

const m = medidasDelDiagrama(16)
const fases = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `f${String(i)}` }))
const salida = (de: number, a: number) => ({
  id: `t${String(de)}-${String(a)}`,
  deFaseId: `f${String(de)}`,
  aFaseId: `f${String(a)}`,
})
const flecha = (flechas: readonly FlechaDelDiagrama[], de: number, a: number) => {
  const encontrada = flechas.find((f) => f.id === `t${String(de)}-${String(a)}`)
  if (!encontrada) throw new Error(`No se dibujó t${String(de)}-${String(a)}.`)
  return encontrada
}

describe('disponerDiagrama: las cajas', () => {
  it('una columna por fase, en su orden y a la misma altura; el tamaño sale de las medidas', () => {
    const d = disponerDiagrama(fases(3), [], m)
    expect(d.nodos.map((n) => [n.id, n.columna])).toEqual([
      ['f0', 0],
      ['f1', 1],
      ['f2', 2],
    ])
    expect(new Set(d.nodos.map((n) => n.y)).size).toBe(1)
    expect(d.nodos[1]?.x).toBe(m.margen + m.ancho + m.separacion)
    expect(d.ancho).toBe(2 * m.margen + 3 * m.ancho + 2 * m.separacion)
    expect(d.alto).toBe(2 * m.margen + m.alto)
  })

  it('las jubiladas van en su columna, como llegan', () => {
    const lista = [{ id: 'a' }, { id: 'jubilada' }, { id: 'b' }]
    expect(disponerDiagrama(lista, [], m).nodos.map((n) => n.id)).toEqual(['a', 'jubilada', 'b'])
  })

  it('las medidas crecen con el rem (el texto al 200 %)', () => {
    expect(medidasDelDiagrama(32).ancho).toBe(2 * medidasDelDiagrama(16).ancho)
  })

  it('sin fases no hay nada que dibujar', () => {
    const d = disponerDiagrama([], [], m)
    expect(d.nodos).toEqual([])
    expect(d.flechas).toEqual([])
  })
})

describe('disponerDiagrama: las salidas', () => {
  it('una cadena es todo rectas, de la caja a la siguiente', () => {
    const d = disponerDiagrama(fases(3), [salida(0, 1), salida(1, 2)], m)
    expect(d.flechas.map((f) => f.forma)).toEqual(['recta', 'recta'])
    const primera = flecha(d.flechas, 0, 1)
    expect(primera.puntos).toHaveLength(2)
    expect(primera.puntos[0]?.x).toBe((d.nodos[0]?.x ?? 0) + m.ancho)
    expect(primera.puntos[1]?.x).toBe(d.nodos[1]?.x)
  })

  it('una rama es un arco arriba, en el carril 1, y deja lugar arriba', () => {
    const d = disponerDiagrama(fases(3), [salida(0, 2)], m)
    const rama = flecha(d.flechas, 0, 2)
    expect([rama.forma, rama.lado, rama.carril, rama.haciaAtras]).toEqual([
      'arco',
      'arriba',
      1,
      false,
    ])
    expect(d.nodos[0]?.y).toBe(m.margen + m.carril)
    expect(rama.puntos[1]?.y).toBe(m.margen)
  })

  it('ramas anidadas van en los carriles 1 y 2', () => {
    const d = disponerDiagrama(fases(4), [salida(0, 3), salida(0, 2)], m)
    expect(flecha(d.flechas, 0, 2).carril).toBe(1)
    expect(flecha(d.flechas, 0, 3).carril).toBe(2)
    expect(flecha(d.flechas, 0, 3).lado).toBe('arriba')
  })

  it('dos ramas que se solapan a medias: la segunda va abajo, sin cruzar', () => {
    const d = disponerDiagrama(fases(4), [salida(0, 2), salida(1, 3)], m)
    expect(flecha(d.flechas, 0, 2).lado).toBe('arriba')
    expect(flecha(d.flechas, 1, 3).lado).toBe('abajo')
    expect(d.flechas.some((f) => f.cruza)).toBe(false)
  })

  it('compartir una punta no es cruzar', () => {
    const d = disponerDiagrama(fases(5), [salida(0, 2), salida(2, 4)], m)
    expect(flecha(d.flechas, 2, 4).lado).toBe('arriba')
  })

  it('una vuelta atrás es un arco abajo', () => {
    const d = disponerDiagrama(fases(3), [salida(2, 0)], m)
    const vuelta = flecha(d.flechas, 2, 0)
    expect([vuelta.forma, vuelta.lado, vuelta.haciaAtras]).toEqual(['arco', 'abajo', true])
    expect(vuelta.puntos[1]?.y).toBeGreaterThan((d.nodos[0]?.y ?? 0) + m.alto)
  })

  it('la vuelta a la vecina va abajo y no pisa su recta', () => {
    const d = disponerDiagrama(fases(2), [salida(0, 1), salida(1, 0)], m)
    expect(flecha(d.flechas, 0, 1).forma).toBe('recta')
    const vuelta = flecha(d.flechas, 1, 0)
    expect([vuelta.forma, vuelta.lado, vuelta.carril]).toEqual(['arco', 'abajo', 1])
  })

  it('una salida hacia una fase que no se leyó (el tope) no se dibuja', () => {
    const d = disponerDiagrama(
      fases(2),
      [salida(0, 1), { id: 'fuera', deFaseId: 'f0', aFaseId: 'f99' }],
      m,
    )
    expect(d.flechas.map((f) => f.id)).toEqual(['t0-1'])
  })

  it('tres arcos que se solapan de a pares: exactamente uno cruza', () => {
    const d = disponerDiagrama(fases(6), [salida(0, 3), salida(1, 4), salida(2, 5)], m)
    expect(d.flechas.filter((f) => f.cruza).map((f) => f.id)).toEqual(['t2-5'])
    expect(flecha(d.flechas, 2, 5).lado).toBe('arriba')
  })
})

describe('disponerDiagrama: los puertos', () => {
  it('cada arco sale y llega por su mitad, y el de afuera más cerca del centro', () => {
    const d = disponerDiagrama(fases(4), [salida(0, 2), salida(0, 3)], m)
    const centro = (d.nodos[0]?.x ?? 0) + m.ancho / 2
    const adentro = flecha(d.flechas, 0, 2).puntos[0]?.x ?? 0
    const afuera = flecha(d.flechas, 0, 3).puntos[0]?.x ?? 0
    expect(adentro).toBeGreaterThan(centro)
    expect(afuera).toBeGreaterThan(centro)
    expect(afuera).toBeLessThan(adentro)
    // En la caja de llegada, viene de la izquierda: entra por la mitad izquierda.
    const llegada = flecha(d.flechas, 0, 2).puntos[3]?.x ?? 0
    expect(llegada).toBeLessThan((d.nodos[2]?.x ?? 0) + m.ancho / 2)
  })

  it('dos arcos en la misma caja y el mismo lado no comparten puerto', () => {
    const d = disponerDiagrama(fases(4), [salida(3, 0), salida(3, 1)], m)
    const xs = d.flechas.map((f) => f.puntos[0]?.x)
    expect(new Set(xs).size).toBe(2)
  })
})

describe('disponerDiagrama: determinismo', () => {
  it('la misma entrada da lo mismo, en cualquier orden de las salidas', () => {
    const salidas = [salida(0, 2), salida(1, 3), salida(3, 0), salida(0, 1), salida(2, 4)]
    const una = disponerDiagrama(fases(5), salidas, m)
    const otra = disponerDiagrama(fases(5), [...salidas].reverse(), m)
    const porId = (d: typeof una) =>
      Object.fromEntries(d.flechas.map((f) => [f.id, [f.lado, f.carril, f.puntos]]))
    expect(porId(otra)).toEqual(porId(una))
    expect(disponerDiagrama(fases(5), salidas, m)).toEqual(una)
  })
})
