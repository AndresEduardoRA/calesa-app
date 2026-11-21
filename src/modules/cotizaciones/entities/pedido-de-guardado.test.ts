import { describe, expect, it } from 'vitest'
import { argumentosDeCrear, type PedidoDeGuardado } from './pedido-de-guardado'

const PEDIDO: PedidoDeGuardado = {
  intento: 'i',
  origenId: 'o',
  leadId: 'l',
  vehiculoId: null,
  abierta: 'f.1.ab',
  entradas: { inputs: { pub: 1 }, banderas: {}, overrides: {} },
  modoTc: null,
  verTotalBs: false,
  conLaAbierta: false,
  titulo: null,
  tituloManual: false,
}

describe('argumentosDeCrear', () => {
  it('los argumentos exactos de cotizacion_crear: preventa, sin vehículo si no hay', () => {
    expect(argumentosDeCrear(PEDIDO)).toEqual({
      p_id: 'i',
      p_origen: 'o',
      p_lead: 'l',
      p_entradas: { inputs: { pub: 1 }, banderas: {}, overrides: {} },
      p_abierta: 'f.1.ab',
      p_ver_total_bs: false,
      p_clase: 'preventa',
      p_con_la_abierta: false,
      p_titulo_manual: false,
    })
  })

  it('con vehículo lo manda, y «Guardar con la N» va con la abierta', () => {
    const args = argumentosDeCrear({ ...PEDIDO, vehiculoId: 'v', conLaAbierta: true })
    expect(args.p_vehiculo).toBe('v')
    expect(args.p_con_la_abierta).toBe(true)
  })

  it('manda p_modo_tc con el modo y lo omite sin él', () => {
    expect(argumentosDeCrear({ ...PEDIDO, modoTc: 'unificado' }).p_modo_tc).toBe('unificado')
    expect('p_modo_tc' in argumentosDeCrear(PEDIDO)).toBe(false)
  })

  it('manda p_ver_total_bs siempre, con lo que quien cotiza dejó', () => {
    expect(argumentosDeCrear({ ...PEDIDO, verTotalBs: true }).p_ver_total_bs).toBe(true)
    expect(argumentosDeCrear(PEDIDO).p_ver_total_bs).toBe(false)
  })

  it('el título: el texto y manual, o sólo «automático» sin texto', () => {
    const manual = argumentosDeCrear({ ...PEDIDO, titulo: 'Para Ana', tituloManual: true })
    expect(manual.p_titulo).toBe('Para Ana')
    expect(manual.p_titulo_manual).toBe(true)
    const automatico = argumentosDeCrear(PEDIDO)
    expect('p_titulo' in automatico).toBe(false)
    expect(automatico.p_titulo_manual).toBe(false)
  })

  it('la privada manda p_privada; pública, o un pendiente de antes sin el campo, no lo manda (la base la deja pública)', () => {
    expect(argumentosDeCrear({ ...PEDIDO, privada: true }).p_privada).toBe(true)
    expect('p_privada' in argumentosDeCrear({ ...PEDIDO, privada: false })).toBe(false)
    expect('p_privada' in argumentosDeCrear(PEDIDO)).toBe(false)
  })
})
