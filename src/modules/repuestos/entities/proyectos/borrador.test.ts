import { describe, expect, it } from 'vitest'
import { BORRADOR_NUEVO_DE_PROYECTO, ELIGE_EL_LEAD, validarProyecto } from './borrador'

const VEHICULO = '00000000-0000-4000-8000-000000000001'
const LEAD = '00000000-0000-4000-8000-000000000003'
const SIN_LEAD = { conLead: false }
const CON_LEAD = { conLead: true }

describe('validarProyecto: de un vehículo', () => {
  it('un proyecto de un vehículo sólo manda el id y las notas, no la etiqueta ni el cliente', () => {
    const r = validarProyecto(
      {
        ...BORRADOR_NUEVO_DE_PROYECTO,
        origen: 'vehiculo',
        vehiculoId: VEHICULO,
        vehiculoEtiqueta: 'sobra',
        vin: 'sobra',
        clienteNombre: 'sobra',
      },
      SIN_LEAD,
    )
    expect(r).toEqual({ ok: true, datos: { vehiculoId: VEHICULO, notas: undefined } })
  })

  it('de un vehículo sin elegir pide el vehículo', () => {
    const r = validarProyecto({ ...BORRADOR_NUEVO_DE_PROYECTO, origen: 'vehiculo' }, SIN_LEAD)
    expect(r).toMatchObject({ ok: false, errores: { vehiculoId: 'Elige el vehículo.' } })
  })

  it('de un vehículo con «Cliente (lead)» manda el lead elegido; sin elegir, no lo manda', () => {
    const base = {
      ...BORRADOR_NUEVO_DE_PROYECTO,
      origen: 'vehiculo' as const,
      vehiculoId: VEHICULO,
    }
    expect(validarProyecto({ ...base, leadId: LEAD }, CON_LEAD)).toEqual({
      ok: true,
      datos: { vehiculoId: VEHICULO, leadId: LEAD, notas: undefined },
    })
    expect(validarProyecto(base, CON_LEAD)).toEqual({
      ok: true,
      datos: { vehiculoId: VEHICULO, notas: undefined },
    })
  })

  it('sin `leads.ver` el lead no se manda aunque quede en el borrador', () => {
    const r = validarProyecto(
      { ...BORRADOR_NUEVO_DE_PROYECTO, origen: 'vehiculo', vehiculoId: VEHICULO, leadId: LEAD },
      SIN_LEAD,
    )
    expect(r).toEqual({ ok: true, datos: { vehiculoId: VEHICULO, notas: undefined } })
  })
})

describe('validarProyecto: externo', () => {
  it('externo sin etiqueta pide qué vehículo es', () => {
    const r = validarProyecto({ ...BORRADOR_NUEVO_DE_PROYECTO, vehiculoEtiqueta: '   ' }, SIN_LEAD)
    expect(r).toMatchObject({
      ok: false,
      errores: { vehiculoEtiqueta: 'Escribe qué vehículo es.' },
    })
  })

  it('externo sin `leads.ver` recorta el cliente y el teléfono escritos y no manda lo vacío', () => {
    const r = validarProyecto(
      { ...BORRADOR_NUEVO_DE_PROYECTO, vehiculoEtiqueta: '  Camión  ', clienteNombre: ' Ana ' },
      SIN_LEAD,
    )
    expect(r).toEqual({
      ok: true,
      datos: {
        vehiculoEtiqueta: 'Camión',
        vin: undefined,
        clienteNombre: 'Ana',
        clienteTelefono: undefined,
        notas: undefined,
      },
    })
  })

  it('externo con «Cliente (lead)» manda el lead y nunca el cliente ni el teléfono escritos', () => {
    const r = validarProyecto(
      {
        ...BORRADOR_NUEVO_DE_PROYECTO,
        vehiculoEtiqueta: 'Camión',
        leadId: LEAD,
        clienteNombre: 'quedó del borrador',
        clienteTelefono: '70000000',
      },
      CON_LEAD,
    )
    expect(r).toEqual({
      ok: true,
      datos: { vehiculoEtiqueta: 'Camión', vin: undefined, leadId: LEAD, notas: undefined },
    })
  })

  it('un lead que no es un id no pasa, en los dos orígenes', () => {
    const externo = { ...BORRADOR_NUEVO_DE_PROYECTO, vehiculoEtiqueta: 'Camión', leadId: 'x' }
    expect(validarProyecto(externo, CON_LEAD)).toMatchObject({
      ok: false,
      errores: { leadId: ELIGE_EL_LEAD },
    })
    expect(
      validarProyecto({ ...externo, origen: 'vehiculo', vehiculoId: VEHICULO }, CON_LEAD),
    ).toMatchObject({ ok: false, errores: { leadId: ELIGE_EL_LEAD } })
  })

  it('topa los textos largos con su campo', () => {
    const r = validarProyecto(
      {
        ...BORRADOR_NUEVO_DE_PROYECTO,
        vehiculoEtiqueta: 'a'.repeat(121),
        notas: 'n'.repeat(2001),
      },
      SIN_LEAD,
    )
    expect(r).toMatchObject({
      ok: false,
      errores: { vehiculoEtiqueta: expect.any(String), notas: expect.any(String) },
    })
  })
})
