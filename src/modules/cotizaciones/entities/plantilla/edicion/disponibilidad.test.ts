import { describe, expect, it } from 'vitest'
import { disponibilidad } from './disponibilidad'
import { celda, grilla } from './edicion.soporte'
import { estadoInicial, reductorDelEditor } from './reductor'

describe('disponibilidad', () => {
  it('sin nada elegido, lo que pide una selección se apaga con su motivo; deshacer y rehacer, sin historial', () => {
    const d = disponibilidad(estadoInicial(grilla(2, 2)))
    expect(d.combinar).toBe('Elige una celda primero.')
    expect(d.filaArriba).toBe('Elige una celda primero.')
    expect(d.deshacer).toBe('No hay nada que deshacer.')
    expect(d.rehacer).toBe('No hay nada que rehacer.')
  })
  it('con una celda elegida: combinar pide más de una; insertar se puede; pegar pide algo copiado', () => {
    const e = reductorDelEditor(estadoInicial(grilla(2, 2, [celda('a', 0, 0)])), {
      tipo: 'seleccionar',
      seleccion: { tipo: 'celdas', ancla: { f: 0, k: 0 }, foco: { f: 0, k: 0 } },
    })
    const d = disponibilidad(e)
    expect(d.combinar).toBe('Elige más de una celda para combinar.')
    expect(d.filaArriba).toBeNull()
    expect(d.columnaDerecha).toBeNull()
    expect(d.pegar).toBe('No hay nada copiado.')
  })
  it('una tarjeta de 16 columnas no deja insertar otra; probar en seco no cambia el estado', () => {
    const e = reductorDelEditor(estadoInicial(grilla(1, 16, [], 50)), {
      tipo: 'seleccionar',
      seleccion: { tipo: 'columnas', desde: 0, hasta: 0 },
    })
    expect(disponibilidad(e).columnaIzquierda).toBe('Ya hay 16 columnas.')
    expect(disponibilidad(e).eliminarFilas).toBe('La tarjeta lleva al menos una fila.')
    expect(e.plantilla.columnas).toHaveLength(16)
    expect(e.rechazo).toBeNull()
  })
})
