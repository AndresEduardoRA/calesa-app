import { describe, expect, it } from 'vitest'
import {
  conflictoDeValor,
  esquemaDeTipoCambioVigente,
  vigentesDesde,
  type TipoCambioVigente,
} from './tipos-cambio-vigentes'

const ID = '0b1f4b00-0000-0000-0000-000000000001'

const fila = {
  id: ID,
  nombre: 'Paralelo',
  moneda_de: 'USD',
  moneda_a: 'BOB',
  valor: 12.4,
  actualizado_en: '2026-11-16T14:00:00.123456+00:00',
  actualizado_por: 'Hugo Nombre',
  valor_cambiado_en: '2026-11-16T13:58:00+00:00',
  valor_cambiado_por: 'Gina Barra',
}

function vigente(datos: Partial<TipoCambioVigente>): TipoCambioVigente {
  return {
    id: ID,
    nombre: 'Paralelo',
    monedaDe: 'USD',
    monedaA: 'BOB',
    valor: 12.4,
    actualizadoEn: '2026-11-16T14:00:00.123456+00:00',
    actualizadoPor: 'Hugo Nombre',
    ultimoCambio: { en: '2026-11-16T13:58:00+00:00', por: 'Gina Barra' },
    ...datos,
  }
}

describe('vigentesDesde', () => {
  it('convierte la fila con su versión tal cual y el último cambio del valor', () => {
    expect(vigentesDesde([esquemaDeTipoCambioVigente.parse(fila)])).toEqual([vigente({})])
  })

  it('acepta los nulos que da la base: sin nombre y sin último cambio', () => {
    const sinNada = esquemaDeTipoCambioVigente.parse({
      ...fila,
      actualizado_por: null,
      valor_cambiado_en: null,
      valor_cambiado_por: null,
    })
    expect(vigentesDesde([sinNada])).toEqual([
      vigente({ actualizadoPor: null, ultimoCambio: null }),
    ])
  })

  it('un último cambio sin nombre conserva la hora', () => {
    const sinNombre = esquemaDeTipoCambioVigente.parse({ ...fila, valor_cambiado_por: null })
    expect(vigentesDesde([sinNombre])[0]?.ultimoCambio).toEqual({
      en: '2026-11-16T13:58:00+00:00',
      por: null,
    })
  })

  it('rechaza una fila sin versión', () => {
    expect(esquemaDeTipoCambioVigente.safeParse({ ...fila, actualizado_en: '' }).success).toBe(
      false,
    )
  })
})

describe('conflictoDeValor', () => {
  it('si el valor cambió, dice a cuánto, quién y cuándo, del último cambio', () => {
    expect(conflictoDeValor({ id: ID, valor: 12.2 }, [vigente({})])).toEqual({
      tipo: 'valor',
      quien: 'Gina Barra',
      valor: 12.4,
      moneda: 'BOB',
      cuando: '2026-11-16T13:58:00+00:00',
    })
  })

  it('si el valor es el mismo, otra persona tocó otra cosa: quién y cuándo de la fila', () => {
    expect(conflictoDeValor({ id: ID, valor: 12.4 }, [vigente({})])).toEqual({
      tipo: 'otro',
      quien: 'Hugo Nombre',
      cuando: '2026-11-16T14:00:00.123456+00:00',
    })
  })

  it('si ya no está entre los vigentes, lo dice', () => {
    expect(conflictoDeValor({ id: ID, valor: 12.2 }, [])).toEqual({ tipo: 'ya_no_esta' })
  })

  it('sin nombre ni último cambio, el valor igual se dice', () => {
    expect(
      conflictoDeValor({ id: ID, valor: 12.2 }, [vigente({ ultimoCambio: null })]),
    ).toMatchObject({ tipo: 'valor', quien: null, cuando: null, valor: 12.4 })
  })
})
