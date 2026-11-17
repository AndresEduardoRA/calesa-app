import { describe, expect, it } from 'vitest'
import { paginaDeSinFecha } from './sin-fecha'

const ID_A = '11111111-1111-4111-8111-111111111111'
const ID_B = '22222222-2222-4222-8222-222222222222'

const fila = (id: string, estado: string, creado: string) => ({
  id,
  titulo: `Tarea ${id.slice(0, 2)}`,
  estado,
  creado_en: creado,
  actualizado_en: '2026-11-12T10:00:00.654321+00:00',
  mia: true,
})

describe('paginaDeSinFecha', () => {
  it('parsea las tareas, su versión y si hay más', () => {
    const pagina = paginaDeSinFecha({
      tareas: [
        fila(ID_A, 'pendiente', '2026-11-11T14:00:00.123456+00:00'),
        fila(ID_B, 'pendiente', '2026-11-10T14:00:00+00:00'),
      ],
      hay_mas: true,
    })
    expect(pagina?.hayMas).toBe(true)
    expect(pagina?.tareas.map((t) => t.id)).toEqual([ID_A, ID_B])
    expect(pagina?.tareas[0]?.actualizadoEn).toBe('2026-11-12T10:00:00.654321+00:00')
    // La precisión del instante se conserva: el cursor la devuelve intacta.
    expect(pagina?.tareas[0]?.creadoEn).toBe('2026-11-11T14:00:00.123456+00:00')
  })

  it('una forma ajena da nulo', () => {
    expect(paginaDeSinFecha(null)).toBeNull()
    expect(paginaDeSinFecha({ tareas: [{ id: 'no-es-uuid' }], hay_mas: false })).toBeNull()
    expect(paginaDeSinFecha({ tareas: [] })).toBeNull()
    // Sin la versión no se puede completar: la forma vieja no pasa.
    const { actualizado_en: _sinVersion, ...vieja } = fila(
      ID_A,
      'pendiente',
      '2026-11-11T14:00:00+00:00',
    )
    expect(paginaDeSinFecha({ tareas: [vieja], hay_mas: false })).toBeNull()
  })
})
