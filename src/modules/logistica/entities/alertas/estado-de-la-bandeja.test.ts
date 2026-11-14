import { describe, expect, it } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import { estadoDeLaBandeja } from './estado-de-la-bandeja'
import type { FilaDeLaBandeja, LecturaDelGrupo } from './grupo-leido'

const fila: FilaDeLaBandeja = {
  grupo: 'sin_resolver',
  vehiculoId: 'v',
  origenId: 'o',
  titulo: 't',
  nombre: 't',
  creadoEn: '2026-11-01T10:00:00Z',
}
const lectura = (filas: FilaDeLaBandeja[]): LecturaDelGrupo => ({
  filas,
  hayMas: false,
  siguiente: null,
  cortada: false,
  conteo: null,
})

describe('estadoDeLaBandeja', () => {
  it('todos leídos y vacíos: nada pendiente hoy', () => {
    expect(
      estadoDeLaBandeja([
        { grupo: 'demorados', resultado: ok(lectura([])) },
        { grupo: 'salidas', resultado: ok(lectura([])) },
      ]),
    ).toEqual({ tipo: 'vacia' })
    expect(estadoDeLaBandeja([])).toEqual({ tipo: 'vacia' })
  })

  it('un grupo vacío se pliega y uno con filas se dibuja con su título', () => {
    const estado = estadoDeLaBandeja([
      { grupo: 'demorados', resultado: ok(lectura([])) },
      { grupo: 'sin_resolver', resultado: ok(lectura([fila])) },
    ])
    expect(estado).toMatchObject({
      tipo: 'grupos',
      grupos: [{ estado: 'filas', grupo: 'sin_resolver', titulo: 'Subastas sin resolver' }],
    })
  })

  it('el error de un grupo se aísla: queda en su lugar y no tumba a los demás', () => {
    const estado = estadoDeLaBandeja([
      { grupo: 'demorados', resultado: fallo('inesperado', 'x') },
      { grupo: 'sin_resolver', resultado: ok(lectura([fila])) },
    ])
    expect(estado).toMatchObject({
      tipo: 'grupos',
      grupos: [
        { estado: 'error', grupo: 'demorados', titulo: 'Demorados' },
        { estado: 'filas', grupo: 'sin_resolver' },
      ],
    })
  })

  it('con todos en error no es «nada pendiente»: se dicen los errores', () => {
    const estado = estadoDeLaBandeja([{ grupo: 'demorados', resultado: fallo('inesperado', 'x') }])
    expect(estado.tipo).toBe('grupos')
  })
})
