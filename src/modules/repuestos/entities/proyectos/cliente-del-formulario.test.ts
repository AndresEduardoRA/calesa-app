import { describe, expect, it } from 'vitest'
import { cambiosDeEstado } from '@/shared/lib/borrador'
import {
  FORMULARIO_VACIO,
  baseDelBorrador,
  conLead,
  conLeadDelVehiculo,
  conOrigen,
  conVehiculo,
  type EstadoDelFormulario,
} from './cliente-del-formulario'

const V1 = { id: '00000000-0000-4000-8000-000000000001', titulo: 'Hilux 2015' }
const V2 = { id: '00000000-0000-4000-8000-000000000002', titulo: 'Corolla 2018' }
const ANA = { id: '00000000-0000-4000-8000-00000000000a', titulo: 'Ana Pérez' }
const BETO = { id: '00000000-0000-4000-8000-00000000000b', titulo: 'Beto Ríos' }

const deUnVehiculo: EstadoDelFormulario = conVehiculo(
  { ...FORMULARIO_VACIO, origen: 'vehiculo' },
  V1,
)

describe('conLeadDelVehiculo', () => {
  it('propone el lead del vehículo en un campo sin tocar', () => {
    expect(conLeadDelVehiculo(deUnVehiculo, V1.id, ANA)).toMatchObject({
      leadId: ANA.id,
      leadTitulo: ANA.titulo,
      leadDelVehiculo: true,
      leadTocado: false,
    })
  })

  it('no pisa un lead que la persona eligió, ni un campo que vació', () => {
    const elegido = conLead(deUnVehiculo, BETO)
    expect(conLeadDelVehiculo(elegido, V1.id, ANA)).toBe(elegido)
    const vaciado = conLead(conLeadDelVehiculo(deUnVehiculo, V1.id, ANA), null)
    expect(conLeadDelVehiculo(vaciado, V1.id, ANA)).toBe(vaciado)
  })

  it('ignora la respuesta de otro vehículo y la que llega ya en «Externo»', () => {
    const otro = conVehiculo(deUnVehiculo, V2)
    expect(conLeadDelVehiculo(otro, V1.id, ANA)).toBe(otro)
    const externo = conOrigen(deUnVehiculo, 'externo')
    expect(conLeadDelVehiculo(externo, V1.id, ANA)).toBe(externo)
  })

  it('un vehículo sin lead (o con uno que no se ve) deja el campo vacío', () => {
    expect(conLeadDelVehiculo(deUnVehiculo, V1.id, null)).toMatchObject({ leadId: '' })
  })
})

describe('cambiar el vehículo o el origen', () => {
  const propuesto = conLeadDelVehiculo(deUnVehiculo, V1.id, ANA)

  it('cambiar o quitar el vehículo quita sólo el lead propuesto', () => {
    expect(conVehiculo(propuesto, V2)).toMatchObject({ vehiculoId: V2.id, leadId: '' })
    expect(conVehiculo(propuesto, null)).toMatchObject({ vehiculoId: '', leadId: '' })
    const elegido = conLead(propuesto, BETO)
    expect(conVehiculo(elegido, V2)).toMatchObject({ vehiculoId: V2.id, leadId: BETO.id })
  })

  it('pasar a «Externo» quita sólo el propuesto; volver a «De un vehículo» no inventa uno', () => {
    expect(conOrigen(propuesto, 'externo')).toMatchObject({ origen: 'externo', leadId: '' })
    expect(conOrigen(conLead(propuesto, BETO), 'externo')).toMatchObject({ leadId: BETO.id })
    expect(conOrigen(conOrigen(propuesto, 'externo'), 'vehiculo')).toMatchObject({ leadId: '' })
  })
})

describe('conLead', () => {
  it('elegir o vaciar marca el campo como tocado y deja de ser el propuesto', () => {
    const propuesto = conLeadDelVehiculo(deUnVehiculo, V1.id, ANA)
    expect(conLead(propuesto, BETO)).toMatchObject({
      leadId: BETO.id,
      leadDelVehiculo: false,
      leadTocado: true,
    })
    expect(conLead(propuesto, null)).toMatchObject({ leadId: '', leadTocado: true })
  })
})

describe('baseDelBorrador', () => {
  it('el lead propuesto no cuenta como escrito', () => {
    const inicial = deUnVehiculo
    const propuesto = conLeadDelVehiculo(inicial, V1.id, ANA)
    expect(cambiosDeEstado(propuesto, baseDelBorrador(inicial, propuesto))).toEqual({})
  })

  it('un lead elegido sí cuenta, con el campo tocado', () => {
    const inicial = deUnVehiculo
    const elegido = conLead(inicial, BETO)
    expect(cambiosDeEstado(elegido, baseDelBorrador(inicial, elegido))).toEqual({
      leadId: BETO.id,
      leadTitulo: BETO.titulo,
      leadTocado: true,
    })
  })

  it('sin propuesto, la base es lo inicial', () => {
    expect(baseDelBorrador(FORMULARIO_VACIO, deUnVehiculo)).toBe(FORMULARIO_VACIO)
  })
})
