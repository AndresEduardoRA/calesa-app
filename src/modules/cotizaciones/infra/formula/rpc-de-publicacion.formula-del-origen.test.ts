import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import type { PedidoDeGuardar } from '../../entities/formula/repositorio'
import { publicacionSobre } from './rpc-de-publicacion'

// Un cliente que anota cada RPC con sus argumentos; la respuesta no importa aquí.
function clienteFalso() {
  const llamadas: [string, Record<string, unknown>][] = []
  const cliente = {
    rpc: (nombre: string, argumentos: Record<string, unknown>) => {
      llamadas.push([nombre, argumentos])
      return Promise.resolve({ data: null, error: null })
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const PUBLICADA = '22222222-2222-4222-8222-222222222222'
const FDO = '44444444-4444-4444-8444-444444444444'
const HORA = '2026-11-07T15:00:00.123456+00:00'

// Las escrituras de la pestaña mandan la fórmula del origen que leyeron: escriben en ella aunque otra pase a ser la de trabajo. Sin ella (nula: un origen que
// todavía no tiene), `p_formula_del_origen` no viaja y la base usa la de trabajo.
const enviadas = (llamadas: [string, Record<string, unknown>][]) =>
  llamadas.map(([rpc, args]) => [rpc, args['p_formula_del_origen']])

async function escribirTodo(formulaDelOrigenId: string | null) {
  const { cliente, llamadas } = clienteFalso()
  const repositorio = publicacionSobre(cliente)
  await repositorio.guardarBorrador({
    origenId: ORIGEN,
    formulaDelOrigenId,
    definicion: { nodos: [] },
    params: {},
    diseno: null,
    nota: null,
    esperada: { sobre: 'borrador', actualizadoEn: HORA },
  } as unknown as PedidoDeGuardar)
  await repositorio.publicar({
    origenId: ORIGEN,
    formulaDelOrigenId,
    nota: 'Va',
    actualizadoEsperado: HORA,
    publicadaEsperada: PUBLICADA,
  })
  await repositorio.revertir({
    origenId: ORIGEN,
    formulaDelOrigenId,
    versionId: PUBLICADA,
    nota: 'Vuelve',
    publicadaEsperada: PUBLICADA,
  })
  await repositorio.descartar({ origenId: ORIGEN, formulaDelOrigenId, actualizadoEsperado: HORA })
  return llamadas
}

describe('publicacionSobre › la fórmula del origen', () => {
  it('guardar, publicar, revertir y descartar la mandan si viene', async () => {
    expect(enviadas(await escribirTodo(FDO))).toEqual([
      ['formula_guardar_borrador', FDO],
      ['formula_publicar', FDO],
      ['formula_revertir', FDO],
      ['formula_descartar_borrador', FDO],
    ])
  })

  it('nula, no viaja: la base escribe en la de trabajo', async () => {
    const llamadas = await escribirTodo(null)
    expect(llamadas).toHaveLength(4)
    for (const [, args] of llamadas) expect(args).not.toHaveProperty('p_formula_del_origen')
  })
})
