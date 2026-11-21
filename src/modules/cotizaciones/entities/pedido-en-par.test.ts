import { describe, expect, it } from 'vitest'
import {
  argumentosDeCrearEnPar,
  argumentosDeGuardarEnPar,
  leerPendienteDeCrearEnPar,
  leerPendienteDeGuardarEnPar,
  serializarPendienteEnPar,
  type PedidoDeCrearEnPar,
  type PedidoDeGuardarEnPar,
} from './pedido-en-par'

const e = (precio: number) => ({ inputs: { precio }, banderas: {}, overrides: {} })
const crear: PedidoDeCrearEnPar = {
  intentos: ['a', 'b'],
  origenId: 'o',
  leadId: null,
  vehiculoId: 'v',
  abierta: 'firma',
  entradas: [e(1), e(2)],
  modoTc: null,
  verTotalBs: false,
  conLaAbierta: true,
  titulo: 'Para Juan',
  tituloManual: true,
}
const guardar: PedidoDeGuardarEnPar = {
  ids: ['x', 'y'],
  intentos: ['i', 'j'],
  actualizadosEn: ['2026-11-19 10:00:00.123456+00', '2026-11-19 10:00:00.123457+00'],
  entradas: [e(1), e(2)],
  notas: [null, 'nota'],
  modoTc: 'oficial',
  verTotalBs: true,
  titulo: null,
  tituloManual: false,
  vehiculoId: 'v',
  cambiaElVehiculo: false,
}

describe('los pedidos en par', () => {
  it('crear manda los dos ids, lo tipeado de cada opción sin variante y lo común una vez', () => {
    expect(argumentosDeCrearEnPar(crear)).toEqual({
      p_ids: ['a', 'b'],
      p_origen: 'o',
      p_lead: null,
      p_entradas: [e(1), e(2)],
      p_abierta: 'firma',
      p_vehiculo: 'v',
      p_con_la_abierta: true,
      p_ver_total_bs: false,
      p_titulo: 'Para Juan',
      p_titulo_manual: true,
    })
  })

  it('las dos hermanas nacen privadas con p_privada; sin la marca, no se manda', () => {
    expect(argumentosDeCrearEnPar({ ...crear, privada: true }).p_privada).toBe(true)
    expect('p_privada' in argumentosDeCrearEnPar(crear)).toBe(false)
    const privada = { ...crear, privada: true }
    expect(leerPendienteDeCrearEnPar(serializarPendienteEnPar(privada))).toEqual(privada)
  })

  it('guardar manda cada versión como el texto de la base y las notas de cada una', () => {
    const a = argumentosDeGuardarEnPar(guardar)
    expect(a.p_actualizados_en_esperados).toEqual(guardar.actualizadosEn)
    expect(a.p_notas).toEqual([null, 'nota'])
    expect(a.p_ids).toEqual(['x', 'y'])
  })

  it('el pendiente vuelve igual y lo que no es un pedido no se lee', () => {
    expect(leerPendienteDeCrearEnPar(serializarPendienteEnPar(crear))).toEqual(crear)
    expect(leerPendienteDeGuardarEnPar(serializarPendienteEnPar(guardar))).toEqual(guardar)
    expect(leerPendienteDeCrearEnPar('{"intentos": ["a"]}')).toBeNull()
    expect(leerPendienteDeGuardarEnPar('no')).toBeNull()
    expect(leerPendienteDeCrearEnPar(null)).toBeNull()
  })
})
