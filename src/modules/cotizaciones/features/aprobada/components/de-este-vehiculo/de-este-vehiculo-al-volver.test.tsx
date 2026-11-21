import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { Activity } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { PaginaLeidaDeEsteVehiculo } from '../../../../entities/aprobada/de-este-vehiculo'

type Respuesta = Resultado<PaginaLeidaDeEsteVehiculo>
const pedidos: { resolver: (r: Respuesta) => void }[] = []
vi.mock('../../../../areas/aprobada/composicion.client', () => ({
  leerDeEsteVehiculo: () =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push({ resolver })
    }),
}))
vi.mock('../../hooks/aprobar-la-cotizacion', () => ({ aprobarLaCotizacion: vi.fn() }))

import { DeEsteVehiculo } from './de-este-vehiculo'

const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const ORIGEN = '00000000-0000-4000-8000-0000000000a1'
const fila = (i: number) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  numero: i,
  origenId: ORIGEN,
  origen: 'Japón',
  clase: 'preventa' as const,
  estado: 'activa' as const,
  titulo: null,
  totalBase: 1000,
  monedaMostrar: 'USD',
  modo: 'Paralelo',
  autor: 'Ana',
  creadoEn: '2026-11-17T10:00:00.123456+00:00',
  actualizadoEn: '2026-11-17T10:00:00.654321+00:00',
  vencida: false,
  venceEl: '2026-11-27',
  aprobada: false,
  privada: false,
})

beforeEach(() => {
  pedidos.length = 0
})
afterEach(cleanup)

describe('DeEsteVehiculo al volver a la pantalla', () => {
  it('si se deja la pantalla antes de que llegue la lectura, al volver a mostrarla la pide otra vez', async () => {
    const bloque = (modo: 'visible' | 'hidden') => (
      <Activity mode={modo}>
        <DeEsteVehiculo vehiculo={{ id: VEHICULO, titulo: 'Toyota Hilux' }} aprobarEn="todos" />
      </Activity>
    )
    // La pregunta de aprobar una privada vive en la URL (nuqs).
    const { rerender } = render(bloque('visible'), { wrapper: withNuqsTestingAdapter() })
    await waitFor(() => {
      expect(pedidos).toHaveLength(1)
    })
    rerender(bloque('hidden'))
    rerender(bloque('visible'))
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
    pedidos[1]?.resolver({
      ok: true,
      data: { fijada: null, filas: [fila(2), fila(1)], siguiente: null },
    })
    expect(await screen.findAllByRole('listitem')).toHaveLength(2)
  })
})
