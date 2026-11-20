import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import { formulasDelOrigenSobre } from './rpc'

const ID = '11111111-1111-4111-8111-111111111111'
const ORIGEN = '22222222-2222-4222-8222-222222222222'
const HORA = '2026-11-20T15:00:00.123456+00:00'

function clienteQueResponde(respuesta: { data: unknown; error: unknown }) {
  const llamadas: { nombre: string; args: unknown }[] = []
  const cliente = {
    rpc: (nombre: string, args: unknown) => {
      llamadas.push({ nombre, args })
      return Promise.resolve(respuesta)
    },
  } as unknown as SupabaseClient<Database>
  return { repo: formulasDelOrigenSobre(cliente), llamadas }
}

describe('formulasDelOrigenSobre', () => {
  it('crear manda el intento, la copia y la pieza, y devuelve los avisos validados', async () => {
    const { repo, llamadas } = clienteQueResponde({
      data: { id: ID, actualizado_en: HORA, avisos: [{ tipo: 'tabla_creada', clave: 'fletes' }] },
      error: null,
    })
    const r = await repo.crear({
      id: ID,
      origenId: ORIGEN,
      nombre: 'Flete',
      copiaDe: null,
      pieza: 'publicada',
    })
    expect(llamadas).toEqual([
      {
        nombre: 'formula_del_origen_crear',
        args: {
          p_id: ID,
          p_origen: ORIGEN,
          p_nombre: 'Flete',
          p_copia_de: null,
          p_pieza: 'publicada',
        },
      },
    ])
    expect(r).toEqual({
      ok: true,
      data: { id: ID, actualizadoEn: HORA, avisos: [{ tipo: 'tabla_creada', clave: 'fletes' }] },
    })
  })

  it('activar manda las ocho esperadas tal cual (nulas incluidas) y la nota', async () => {
    const { repo, llamadas } = clienteQueResponde({
      data: { activa: ID, formula: ID, plantilla: ID, actualizado_en: HORA },
      error: null,
    })
    const r = await repo.activar({
      id: ID,
      esperada: HORA,
      activaEsperada: null,
      borradorEsperado: HORA,
      publicadaEsperada: null,
      plantillaBorradorEsperado: null,
      plantillaPublicadaEsperada: ORIGEN,
      nota: 'Empieza el flete nuevo.',
    })
    expect(llamadas[0]).toEqual({
      nombre: 'formula_del_origen_activar',
      args: {
        p_id: ID,
        p_actualizado_en_esperado: HORA,
        p_nota: 'Empieza el flete nuevo.',
        p_activa_esperada: null,
        p_borrador_esperado: HORA,
        p_publicada_esperada: null,
        p_plantilla_borrador_esperado: null,
        p_plantilla_publicada_esperada: ORIGEN,
      },
    })
    expect(r.ok).toBe(true)
  })
})

describe('formulasDelOrigenSobre: renombrar, archivar y eliminar', () => {
  it('un PT409 llega como conflicto con el mensaje de la base', async () => {
    const { repo } = clienteQueResponde({
      data: null,
      error: { code: 'PT409', message: 'Ana la cambió hace un momento.' },
    })
    const r = await repo.renombrar({ id: ID, esperada: HORA, nombre: 'Otra' })
    expect(r).toMatchObject({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ana la cambió hace un momento.' },
    })
  })

  it('archivar y eliminar mandan la versión vista', async () => {
    const { repo, llamadas } = clienteQueResponde({ data: HORA, error: null })
    await repo.archivar({ id: ID, esperada: HORA })
    expect(llamadas[0]).toEqual({
      nombre: 'formula_del_origen_archivar',
      args: { p_id: ID, p_actualizado_en_esperado: HORA },
    })
    const eliminar = clienteQueResponde({ data: null, error: null })
    expect(await eliminar.repo.eliminar({ id: ID, esperada: HORA })).toEqual({
      ok: true,
      data: { id: ID },
    })
  })
})
