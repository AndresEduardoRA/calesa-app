import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  LIMITES_DEL_MAXIMO,
  MOTIVO_SIN_EXTRAS,
  motivoDeTope,
  puedeEditarTelefonosExtra,
  telefonosDeLaFicha,
  topeDeExtras,
} from './telefonos'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const PRINCIPAL = '59170011002'

describe('topeDeExtras', () => {
  it('con lugar no dice nada', () => {
    expect(topeDeExtras(5, 6)).toEqual({ alcanzado: false, sobran: 0, motivo: '' })
    expect(topeDeExtras(0, 1).alcanzado).toBe(false)
  })

  it('con el máximo dice lo mismo que la base', () => {
    expect(topeDeExtras(6, 6)).toEqual({
      alcanzado: true,
      sobran: 0,
      motivo: 'Un lead admite hasta 6 teléfonos extra. Quita uno para agregar otro.',
    })
  })

  it('con 0 la empresa no admite extras, y lo dice como la base', () => {
    expect(topeDeExtras(0, 0)).toEqual({ alcanzado: true, sobran: 0, motivo: MOTIVO_SIN_EXTRAS })
    expect(motivoDeTope(0)).toBe('Esta empresa no admite teléfonos extra.')
  })

  it('con más que el máximo (se bajó después) dice cuántos quitar para poder agregar otro', () => {
    expect(topeDeExtras(3, 2)).toEqual({
      alcanzado: true,
      sobran: 1,
      motivo: 'Este lead tiene 3 teléfonos extra y el máximo es 2: quita 2 para agregar otro.',
    })
    expect(topeDeExtras(5, 3).motivo).toContain('quita 3 para agregar otro')
  })

  it('el rango de la empresa es de 0 a 20', () => {
    expect(LIMITES_DEL_MAXIMO).toEqual({ minimo: 0, maximo: 20 })
  })
})

describe('puedeEditarTelefonosExtra', () => {
  const propios: Permisos = [
    { clave: 'leads.telefonos_extra.editar', origenId: null, alcance: 'propios' },
  ]
  const todos: Permisos = [
    { clave: 'leads.telefonos_extra.editar', origenId: null, alcance: 'todos' },
  ]
  const soloEditar: Permisos = [{ clave: 'leads.editar', origenId: null, alcance: 'todos' }]

  it('pide la cartera aunque el alcance sea «todos»', () => {
    expect(puedeEditarTelefonosExtra(todos, false)).toBe(false)
    expect(puedeEditarTelefonosExtra(todos, true)).toBe(true)
    expect(puedeEditarTelefonosExtra(propios, true)).toBe(true)
  })

  it('no depende de leads.editar: tener sólo esa no alcanza', () => {
    expect(puedeEditarTelefonosExtra(soloEditar, true)).toBe(false)
    expect(puedeEditarTelefonosExtra([], true)).toBe(false)
  })
})

describe('telefonosDeLaFicha', () => {
  it('saca de la ficha el principal, los extras y el máximo', () => {
    const ficha = {
      id: ID,
      telefonoCc: '+591',
      telefono: PRINCIPAL,
      enCartera: false,
      telefonos: [],
      telefonosMaximo: 3,
    } as unknown as Parameters<typeof telefonosDeLaFicha>[0]
    expect(telefonosDeLaFicha(ficha)).toEqual({
      id: ID,
      telefonoCc: '+591',
      telefono: PRINCIPAL,
      enCartera: false,
      telefonos: [],
      telefonosMaximo: 3,
    })
  })
})
