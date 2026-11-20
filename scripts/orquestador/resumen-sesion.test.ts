import { expect, it } from 'vitest'
import { leerSesion, UMBRAL_CONTEXTO } from './resumen-sesion.mjs'

// El contexto de una sesión (resumen-sesion.mjs): promedio y máximo por turno, de cada `usage`, y las compactaciones.

const linea = (o: unknown) => JSON.stringify(o)
const turno = (id: string, usage: Record<string, number>, extra: object = {}) =>
  linea({ type: 'assistant', message: { id, content: [], usage }, ...extra })

it('el contexto promedio, el máximo y las compactaciones de un stream de prueba', () => {
  const s = leerSesion(
    'sesion-1-tarea',
    [
      turno('a', {
        input_tokens: 10,
        cache_creation_input_tokens: 90,
        cache_read_input_tokens: 100_000,
      }),
      // El mismo mensaje repetido por cada bloque de contenido: cuenta una vez.
      turno('a', {
        input_tokens: 10,
        cache_creation_input_tokens: 90,
        cache_read_input_tokens: 100_000,
      }),
      turno('b', {
        input_tokens: 5,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 499_995,
      }),
      // Un subagente tiene su propio contexto: no cuenta.
      turno('c', { input_tokens: 900_000 }, { parent_tool_use_id: 'toolu_1' }),
      linea({ type: 'system', subtype: 'compact_boundary', compact_metadata: { trigger: 'auto' } }),
      linea({ type: 'system', subtype: 'init' }),
      '{rota',
      turno('d', { input_tokens: 40_000 }),
    ].join('\n'),
  )
  expect(s.contexto).toEqual({
    turnos: 3,
    suma: 100_100 + 500_000 + 40_000,
    max: 500_000,
    sobre: 1,
  })
  expect(UMBRAL_CONTEXTO).toBe(300_000)
  expect(s.compactaciones).toBe(1)
})

it('una sesión sin usage no inventa contexto', () => {
  const s = leerSesion('plan', linea({ type: 'result', duration_ms: 1, num_turns: 1 }))
  expect(s.contexto).toBeUndefined()
  expect(s.compactaciones).toBe(0)
})
