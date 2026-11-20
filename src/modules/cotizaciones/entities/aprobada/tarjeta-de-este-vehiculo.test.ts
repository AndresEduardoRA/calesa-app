import { describe, expect, it } from 'vitest'
import type { FilaDeEsteVehiculo } from './de-este-vehiculo'
import { tarjetaDeEsteVehiculo } from './tarjeta-de-este-vehiculo'

const fila = (i: number): FilaDeEsteVehiculo => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  numero: i,
  origenId: '00000000-0000-4000-8000-0000000000a1',
  origen: 'Japón',
  clase: 'preventa',
  estado: 'activa',
  titulo: null,
  totalBase: 10,
  monedaMostrar: null,
  modo: 'Unificado',
  autor: 'Gala',
  creadoEn: '2026-10-29T08:00:00+00:00',
  actualizadoEn: '2026-10-29T09:00:00+00:00',
  vencida: false,
  aprobada: false,
  venceEl: '2026-11-28',
})

describe('tarjetaDeEsteVehiculo', () => {
  it('lleva el vehículo para el título y ningún cliente', () => {
    expect(tarjetaDeEsteVehiculo(fila(3), 'Toyota Hilux')).toMatchObject({
      id: fila(3).id,
      vehiculo: 'Toyota Hilux',
      cliente: null,
      leadId: null,
      venceEl: '2026-11-28',
    })
  })
})
