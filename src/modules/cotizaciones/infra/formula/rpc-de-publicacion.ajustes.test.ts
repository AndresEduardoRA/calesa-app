import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import { publicacionSobre } from './rpc-de-publicacion'

type Respuesta = {
  data: unknown
  error: { code?: string; message: string; hint?: string } | null
}

// El ⚙ de la hoja (una constante, la cabecera): escribe en la fórmula activa del origen, nunca manda `p_formula_del_origen`.

// Un cliente que anota cada RPC con sus argumentos y responde lo que se le da.
function clienteFalso(respuesta: Respuesta) {
  const llamadas: [string, unknown][] = []
  const cliente = {
    rpc: (nombre: string, argumentos: unknown) => {
      llamadas.push([nombre, argumentos])
      return Promise.resolve(respuesta)
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const PUBLICADA = '22222222-2222-4222-8222-222222222222'
const NUEVA = '33333333-3333-4333-8333-333333333333'

describe('publicacionSobre › cambiarConstante', () => {
  const pedido = { origenId: ORIGEN, nodo: 'flete', valor: 0.13, publicadaEsperada: PUBLICADA }

  it('llama formula_cambiar_constante con el origen, el nodo, el valor y la publicada esperada, siempre', async () => {
    const { cliente, llamadas } = clienteFalso({ data: NUEVA, error: null })
    const hecho = await publicacionSobre(cliente).cambiarConstante(pedido)
    expect(llamadas).toEqual([
      [
        'formula_cambiar_constante',
        { p_origen: ORIGEN, p_nodo: 'flete', p_valor: 0.13, p_publicada_esperada: PUBLICADA },
      ],
    ])
    expect(hecho).toEqual({ ok: true, data: NUEVA })
  })

  it('el PT409 es un conflicto con el mensaje de la base intacto, sin campo', async () => {
    const { cliente } = clienteFalso({
      data: null,
      error: { code: 'PT409', message: 'Ana publicó la versión 3 hace 2 min.' },
    })
    expect(await publicacionSobre(cliente).cambiarConstante(pedido)).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ana publicó la versión 3 hace 2 min.' },
    })
  })

  it('el 22023 con hint «valor» va al campo «valor»', async () => {
    const { cliente } = clienteFalso({
      data: null,
      error: { code: '22023', message: 'La constante ya tiene ese valor.', hint: 'valor' },
    })
    expect(await publicacionSobre(cliente).cambiarConstante(pedido)).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'La constante ya tiene ese valor.' },
      campo: 'valor',
    })
  })

  it('otro 22023 (el hint de un nodo de _formula_rechazar, o sin hint) es una regla sin campo', async () => {
    const delNodo = clienteFalso({
      data: null,
      error: { code: '22023', message: 'El flete no puede ser negativo.', hint: 'flete' },
    })
    expect(await publicacionSobre(delNodo.cliente).cambiarConstante(pedido)).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'El flete no puede ser negativo.' },
    })
    const sinHint = clienteFalso({
      data: null,
      error: { code: '22023', message: 'El origen no tiene fórmula publicada.' },
    })
    expect(await publicacionSobre(sinHint.cliente).cambiarConstante(pedido)).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'El origen no tiene fórmula publicada.' },
    })
  })

  it('una respuesta que no es un id es inesperada', async () => {
    const { cliente } = clienteFalso({ data: 'otra cosa', error: null })
    const hecho = await publicacionSobre(cliente).cambiarConstante(pedido)
    expect(hecho.ok ? null : hecho.error.codigo).toBe('inesperado')
  })
})

describe('publicacionSobre › cambiarCabecera', () => {
  const pedido = {
    origenId: ORIGEN,
    modoPorDefecto: 'unificado',
    verTotalBsPorDefecto: true,
    modosVisibles: ['unificado'],
    publicadaEsperada: PUBLICADA,
  }

  it('llama formula_cambiar_cabecera con las tres claves y la publicada esperada, siempre', async () => {
    const { cliente, llamadas } = clienteFalso({ data: NUEVA, error: null })
    const hecho = await publicacionSobre(cliente).cambiarCabecera(pedido)
    expect(llamadas).toEqual([
      [
        'formula_cambiar_cabecera',
        {
          p_origen: ORIGEN,
          p_modo_por_defecto: 'unificado',
          p_ver_total_bs_por_defecto: true,
          p_modos_visibles: ['unificado'],
          p_publicada_esperada: PUBLICADA,
        },
      ],
    ])
    expect(hecho).toEqual({ ok: true, data: NUEVA })
  })

  it('el PT409 es un conflicto con el mensaje de la base; los mismos valores, una regla sin campo', async () => {
    const conflicto = clienteFalso({
      data: null,
      error: { code: 'PT409', message: 'Ana publicó la versión 3 hace 2 min.' },
    })
    expect(await publicacionSobre(conflicto.cliente).cambiarCabecera(pedido)).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ana publicó la versión 3 hace 2 min.' },
    })
    const mismos = clienteFalso({
      data: null,
      error: { code: '22023', message: 'La cabecera ya tiene esos valores.', hint: 'cabecera' },
    })
    expect(await publicacionSobre(mismos.cliente).cambiarCabecera(pedido)).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'La cabecera ya tiene esos valores.' },
    })
  })
})
