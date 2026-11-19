// Lo que comparten las pruebas de `useAjusteDeLaCabecera`: la action y la lectura simuladas, la hoja y las respuestas. Sólo para las pruebas (el sufijo `.soporte.` lo
// deja fuera del mapa). Las pruebas lo traen dentro de su `vi.mock` con `await import()`, así que no importa el hook.
import { act, waitFor } from '@testing-library/react'
import { expect, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { CabeceraPublicada } from '../../../areas/formula/composicion.client'
import type { PropsDelAjusteDeLaCabecera } from '../../hoja/components/huecos'

export const ejecutar = vi.fn()
export const avisarExito = vi.fn()

type Respuesta = Resultado<CabeceraPublicada | null>
export const pedidos: ((r: Respuesta) => void)[] = []
export const leerSimulado = () =>
  new Promise<Respuesta>((resolver) => {
    pedidos.push(resolver)
  })

export const ORIGEN = '11111111-1111-4111-8111-111111111111'
export const PUBLICADA = '22222222-2222-4222-8222-222222222222'
export const OTRA_PUBLICADA = '33333333-3333-4333-8333-333333333333'

export const MODOS = [
  { clave: 'paralelo', nombre: 'Paralelo' },
  { clave: 'unificado', nombre: 'Unificado' },
]

export const leida = (cambios: Partial<CabeceraPublicada> = {}): Respuesta => ({
  ok: true,
  data: {
    publicadaId: PUBLICADA,
    version: 3,
    modos: MODOS,
    verTotalBs: true,
    modoPorDefecto: null,
    verTotalBsPorDefecto: false,
    modosVisibles: null,
    ...cambios,
  },
})

// Contesta el pedido n.º `n` (desde 1) de la lectura de la cabecera.
export const responder = async (n: number, r: Respuesta) => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThanOrEqual(n)
  })
  await act(async () => {
    pedidos[n - 1]?.(r)
    await Promise.resolve()
  })
}

export const ok = (id = 'nueva') => ({ data: { ok: true, data: id } })
export const falla = (codigo: string, mensaje: string) => ({
  data: { ok: false, error: { codigo, mensaje } },
})

// Lo que la hoja le da al panel: su versión, su cabecera (con moneda), lo elegido y cómo cambiarlo.
export function hojaDePrueba(cambios: Partial<PropsDelAjusteDeLaCabecera['hoja']> = {}) {
  const alElegirModo = vi.fn()
  const alCambiarVerTotalBs = vi.fn()
  const hoja: PropsDelAjusteDeLaCabecera['hoja'] = {
    formula: { id: PUBLICADA, version: 3 },
    cabecera: {
      modos: MODOS,
      verTotalBs: true,
      monedaBs: 'BOB',
      ajustes: true,
      modoPorDefecto: null,
      verTotalBsPorDefecto: false,
      modosVisibles: null,
    },
    modoElegido: 'paralelo',
    verTotalBs: false,
    soloLectura: false,
    alElegirModo,
    alCambiarVerTotalBs,
    ...cambios,
  }
  return { hoja, alElegirModo, alCambiarVerTotalBs }
}

export const pedidoMandado = (n = 0) =>
  ejecutar.mock.calls[n]?.[0] as Record<string, unknown> | undefined

export function reiniciar() {
  pedidos.length = 0
  ejecutar.mockReset()
  avisarExito.mockReset()
}
