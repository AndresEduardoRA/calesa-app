import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import type { PedidoDePaquete } from '../../entities/plantillas-de-v1/pedido'
import { aplicarPlantillaDeV1, leerEstadoParaPlantillasDeV1 } from './plantillas-de-v1'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const FDO = '77777777-7777-4777-8777-777777777777'
const ANA = '22222222-2222-4222-8222-222222222222'
const HORA = '2026-11-19T20:00:00.123456+00:00'

type Respuesta = { data: unknown; error: { code?: string; message: string; hint?: string } | null }

// Un cliente que responde por tabla y por RPC, y anota lo que se pidió.
function clienteFalso(tablas: Record<string, Respuesta>, rpc?: Respuesta) {
  const llamadas: unknown[][] = []
  const consulta = (tabla: string) => {
    const q: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'order', 'limit']) {
      q[m] = (...args: unknown[]) => {
        llamadas.push([tabla, m, ...args])
        return q
      }
    }
    q['then'] = (resolver: (r: Respuesta) => unknown) =>
      Promise.resolve(tablas[tabla] ?? { data: [], error: null }).then(resolver)
    return q
  }
  const cliente = {
    from: (tabla: string) => consulta(tabla),
    rpc: (nombre: string, args: unknown) => {
      llamadas.push(['rpc', nombre, args])
      return Promise.resolve(rpc ?? { data: null, error: null })
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

describe('leerEstadoParaPlantillasDeV1', () => {
  it('los dos borradores con sus horas como texto, el autor y el catálogo, cada lectura con su tope', async () => {
    const { cliente, llamadas } = clienteFalso({
      formulas: { data: [{ creado_por: ANA, actualizado_en: HORA }], error: null },
      plantillas_tarjeta: { data: [{ actualizado_en: HORA }], error: null },
      tonos: { data: [{ clave: 'verde', nombre: 'Verde', hex: '#00ff00' }], error: null },
      perfiles: { data: [{ nombre: 'Ana', email: 'ana@x.com' }], error: null },
    })
    const r = await leerEstadoParaPlantillasDeV1(cliente, ORIGEN)
    expect(r).toEqual({
      ok: true,
      data: {
        formula: { creadoPor: ANA, autor: 'Ana', actualizadoEn: HORA },
        tarjeta: { actualizadoEn: HORA },
        catalogo: [{ clave: 'verde', nombre: 'Verde', hex: '#00ff00' }],
      },
    })
    expect(llamadas).toContainEqual(['formulas', 'eq', 'estado', 'borrador'])
    expect(llamadas).toContainEqual(['formulas', 'limit', 1])
    expect(llamadas).toContainEqual(['plantillas_tarjeta', 'limit', 1])
    expect(llamadas).toContainEqual(['tonos', 'limit', 48])
    expect(llamadas).toContainEqual(['perfiles', 'eq', 'id', ANA])
  })

  it('sin borradores no pide el autor', async () => {
    const { cliente, llamadas } = clienteFalso({})
    const r = await leerEstadoParaPlantillasDeV1(cliente, ORIGEN)
    expect(r).toEqual({ ok: true, data: { formula: null, tarjeta: null, catalogo: [] } })
    expect(llamadas.some((l) => l[0] === 'perfiles')).toBe(false)
  })

  it('una lectura que falla es el error de la base', async () => {
    const { cliente } = clienteFalso({
      tonos: { data: null, error: { code: '42501', message: 'No tienes permiso.' } },
    })
    const r = await leerEstadoParaPlantillasDeV1(cliente, ORIGEN)
    expect(r.ok ? null : r.error.codigo).toBe('sin_permiso')
  })
})

describe('aplicarPlantillaDeV1', () => {
  const pedido = { nota: 'x' } as unknown as PedidoDePaquete

  it('manda los parámetros exactos (las esperadas nulas, nulas) y devuelve las horas', async () => {
    const { cliente, llamadas } = clienteFalso(
      {},
      {
        data: {
          formula: { id: ORIGEN, actualizado_en: HORA },
          plantilla: HORA,
          colores: ['v1_teal'],
        },
        error: null,
      },
    )
    const r = await aplicarPlantillaDeV1(cliente, {
      origenId: ORIGEN,
      formulaDelOrigenId: FDO,
      pedido,
      formulaEsperada: null,
      plantillaEsperada: HORA,
    })
    expect(llamadas).toEqual([
      [
        'rpc',
        'cotizacion_paquete_aplicar',
        {
          p_origen: ORIGEN,
          p_paquete: pedido,
          p_formula_esperada: null,
          p_plantilla_esperada: HORA,
          p_formula_del_origen: FDO,
        },
      ],
    ])
    expect(r).toEqual({ ok: true, data: { formula: HORA, plantilla: HORA } })
  })

  const rechazo = async (error: Respuesta['error']) => {
    const { cliente } = clienteFalso({}, { data: null, error })
    return aplicarPlantillaDeV1(cliente, {
      origenId: ORIGEN,
      formulaDelOrigenId: FDO,
      pedido,
      formulaEsperada: null,
      plantillaEsperada: null,
    })
  }

  it('el PT409, tal cual; el 42501, sin permiso', async () => {
    const pt409 = 'Ya hay un borrador: lo empezó Ana y se guardó hace 2 min.'
    expect(await rechazo({ code: 'PT409', message: pt409 })).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: pt409 },
    })
    expect((await rechazo({ code: '42501', message: 'No tienes el permiso.' })).ok).toBe(false)
    const r = await rechazo({ code: '42501', message: 'No tienes el permiso «x».' })
    expect(r.ok ? null : r.error.codigo).toBe('sin_permiso')
  })

  it('el 22023 de los colores con su texto; otro, con su donde', async () => {
    const tope =
      'No hay lugar para 2 colores más en el catálogo (máximo 48): elimina alguno que no se use.'
    expect(await rechazo({ code: '22023', message: tope, hint: 'colores' })).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: tope },
    })
    expect(
      await rechazo({
        code: '22023',
        message: 'El paquete está incompleto.',
        hint: 'paquete.tarjeta',
      }),
    ).toEqual({
      ok: false,
      error: {
        codigo: 'regla',
        mensaje: 'La base rechazó la plantilla: El paquete está incompleto. (paquete.tarjeta).',
      },
    })
  })
})
