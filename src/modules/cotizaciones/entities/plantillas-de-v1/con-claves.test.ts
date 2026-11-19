import { describe, expect, it } from 'vitest'
import { plantillaConClaves } from './con-claves'
import { plantillaDeV1 } from '.'

describe('plantillaConClaves', () => {
  const usa = plantillaDeV1('usa')
  const mapa = { v1_verde: 'v1_usa_verde', v1_teal: 'v1_usa_teal' }
  const r = plantillaConClaves(usa, mapa)

  it('reescribe los grupos, las secciones del diseño y el fondo de las celdas', () => {
    expect(r.formula.definicion.grupos?.map((g) => g.tono)).toEqual([
      'v1_usa_verde',
      'v1_amarillo',
      'v1_naranja',
    ])
    expect(r.formula.diseno.secciones.find((s) => s.id === 'primer_pago')?.tono).toBe(
      'v1_usa_verde',
    )
    expect(r.tarjeta.celdas.find((c) => c.id === 'titulo')?.estilo?.fondo).toBe('v1_usa_teal')
    expect(r.tarjeta.celdas.find((c) => c.id === 'remate_concepto')?.estilo?.fondo).toBe(
      'v1_usa_verde',
    )
    const usados = new Set(r.tarjeta.celdas.map((c) => c.estilo?.fondo))
    expect(usados.has('v1_verde') || usados.has('v1_teal')).toBe(false)
  })

  it('el texto de una celda y la cabecera también, y lo demás no cambia', () => {
    const china = plantillaDeV1('china')
    const conTexto = plantillaConClaves(china, { v1_amarillo_fuerte: 'v1_china_amarillo_fuerte' })
    expect(conTexto.tarjeta.celdas.find((c) => c.id === 'total_monto')?.estilo).toMatchObject({
      fondo: 'v1_azul_marino',
      texto: 'v1_china_amarillo_fuerte',
    })
    const conCabecera = plantillaConClaves(
      {
        ...usa,
        formula: {
          ...usa.formula,
          diseno: {
            ...usa.formula.diseno,
            cabecera: { ...usa.formula.diseno.cabecera, tono: 'v1_teal' },
          },
        },
      },
      mapa,
    )
    expect(conCabecera.formula.diseno.cabecera.tono).toBe('v1_usa_teal')
    expect(r.formula.definicion.nodos).toBe(usa.formula.definicion.nodos)
    expect(r.formula.params).toBe(usa.formula.params)
    expect(r.tarjeta.filas).toBe(usa.tarjeta.filas)
    expect(r.tarjeta.celdas.find((c) => c.id === 'garantia_vacio')).toEqual(
      usa.tarjeta.celdas.find((c) => c.id === 'garantia_vacio'),
    )
  })

  it('sin cambios en el mapa, la misma plantilla', () => {
    expect(plantillaConClaves(usa, {})).toEqual(usa)
  })
})
