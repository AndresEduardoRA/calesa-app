import { describe, expect, it } from 'vitest'
import {
  claveDeTipoCambio,
  decimalesDeValor,
  gruposPorPar,
  parDeLaClave,
  historialDesde,
  motivoParaNoMarcar,
  paraLaBarra,
  textoParaEditar,
  tiposCambioDesde,
  tiposEnLaBarra,
  TOPE_EN_LA_BARRA,
  VALOR_INVALIDO,
  valorTipeado,
  vigentes,
  type TipoCambio,
} from './tipos-cambio'

function tipo(datos: Partial<TipoCambio>): TipoCambio {
  return {
    id: 'a',
    clave: 'oficial',
    nombre: 'Oficial',
    monedaDe: 'USD',
    monedaA: 'BOB',
    valor: 6.96,
    esDefault: false,
    activo: true,
    enLaBarra: false,
    actualizadoEn: '2026-10-12T14:00:00+00:00',
    ...datos,
  }
}

describe('tiposCambioDesde', () => {
  it('convierte las filas con su versión', () => {
    const [convertido] = tiposCambioDesde([
      {
        id: 'a',
        clave: 'oficial',
        nombre: 'Oficial',
        moneda_de: 'USD',
        moneda_a: 'BOB',
        valor: 6.96,
        es_default: true,
        activo: true,
        en_la_barra: true,
        orden: 0,
        actualizado_en: '2026-10-12T14:00:00+00:00',
        actualizado_por: null,
      },
    ])
    expect(convertido).toEqual(tipo({ esDefault: true, enLaBarra: true }))
  })
})

describe('historialDesde', () => {
  it('pone el nombre de quien cambió el valor, o nada si no se sabe', () => {
    const nombres = new Map([['u1', 'Dalia Rojas']])
    const historial = historialDesde(
      [
        {
          id: 3,
          valor_anterior: 6.96,
          valor_nuevo: 6.97,
          cambiado_por: 'u1',
          cambiado_en: '2026-10-12T14:00:00+00:00',
        },
        {
          id: 2,
          valor_anterior: 6.9,
          valor_nuevo: 6.96,
          cambiado_por: 'u9',
          cambiado_en: '2026-10-11T14:00:00+00:00',
        },
        {
          id: 1,
          valor_anterior: null,
          valor_nuevo: 6.9,
          cambiado_por: null,
          cambiado_en: '2026-10-10T14:00:00+00:00',
        },
      ],
      nombres,
    )
    expect(historial.map((cambio) => cambio.cambiadoPor)).toEqual(['Dalia Rojas', null, null])
    expect(historial[2]).toMatchObject({ valorAnterior: null, valorNuevo: 6.9 })
  })
})

describe('vigentes', () => {
  it('deja sólo los activos, con el por defecto adelante y el resto en su orden', () => {
    const lista = [
      tipo({ id: '1', clave: 'banco' }),
      tipo({ id: '2', clave: 'viejo', activo: false }),
      tipo({ id: '3', clave: 'oficial', esDefault: true }),
      tipo({ id: '4', clave: 'paralelo' }),
    ]
    expect(vigentes(lista).map((uno) => uno.clave)).toEqual(['oficial', 'banco', 'paralelo'])
  })

  it('no modifica la lista que recibe', () => {
    const lista = [tipo({ id: '1' }), tipo({ id: '2', esDefault: true })]
    vigentes(lista)
    expect(lista.map((uno) => uno.id)).toEqual(['1', '2'])
  })
})

describe('tiposEnLaBarra', () => {
  const claves = (lista: TipoCambio[]) => tiposEnLaBarra(lista).map((uno) => uno.clave)

  it('muestra los activos marcados, con el por defecto adelante y el resto en su orden', () => {
    const lista = [
      tipo({ id: '1', clave: 'banco' }),
      tipo({ id: '2', clave: 'paralelo', enLaBarra: true }),
      tipo({ id: '3', clave: 'oficial', esDefault: true, enLaBarra: true }),
    ]
    expect(claves(lista)).toEqual(['oficial', 'paralelo'])
  })

  it('sin ninguno marcado muestra el por defecto: la barra nunca queda vacía', () => {
    const lista = [
      tipo({ id: '1', clave: 'banco' }),
      tipo({ id: '2', clave: 'oficial', esDefault: true }),
    ]
    expect(claves(lista)).toEqual(['oficial'])
  })

  it('un marcado inactivo no se ve, y si era el único vuelve el por defecto', () => {
    const lista = [
      tipo({ id: '1', clave: 'oficial', esDefault: true }),
      tipo({ id: '2', clave: 'viejo', activo: false, enLaBarra: true }),
    ]
    expect(claves(lista)).toEqual(['oficial'])
  })

  it('con más marcados que el tope (al reactivar uno) corta en el tope', () => {
    const lista = ['a', 'b', 'c', 'd'].map((clave) => tipo({ id: clave, clave, enLaBarra: true }))
    expect(claves(lista)).toEqual(['a', 'b', 'c'].slice(0, TOPE_EN_LA_BARRA))
  })

  it('sin activos no hay nada que mostrar', () => {
    expect(tiposEnLaBarra([tipo({ activo: false, enLaBarra: true })])).toEqual([])
  })

  it('no modifica la lista que recibe', () => {
    const lista = [
      tipo({ id: '1', enLaBarra: true }),
      tipo({ id: '2', esDefault: true, enLaBarra: true }),
    ]
    tiposEnLaBarra(lista)
    expect(lista.map((uno) => uno.id)).toEqual(['1', '2'])
  })

  it('a la barra viaja sólo lo que se dibuja', () => {
    expect(paraLaBarra([tipo({ id: 'x', esDefault: true })])).toEqual([
      { id: 'x', nombre: 'Oficial', monedaA: 'BOB', valor: 6.96 },
    ])
  })
})

describe('motivoParaNoMarcar', () => {
  const marcados = ['a', 'b', 'c'].map((id) => tipo({ id, enLaBarra: true }))

  it('un inactivo no se suma, según lo que dice el formulario', () => {
    const libre = tipo({ id: 'x', activo: false })
    expect(motivoParaNoMarcar({ tipo: libre, activo: false, tipos: [libre] })).toBe('inactivo')
    expect(motivoParaNoMarcar({ tipo: libre, activo: true, tipos: [libre] })).toBeNull()
  })

  it('con el tope lleno de activos no se suma otro', () => {
    const libre = tipo({ id: 'x' })
    expect(motivoParaNoMarcar({ tipo: libre, activo: true, tipos: [...marcados, libre] })).toBe(
      'tope',
    )
  })

  it('uno ya marcado siempre se puede quitar', () => {
    const [primero] = marcados
    if (!primero) throw new Error('falta el primero')
    expect(motivoParaNoMarcar({ tipo: primero, activo: false, tipos: marcados })).toBeNull()
  })

  it('un marcado inactivo no cuenta para el tope', () => {
    const libre = tipo({ id: 'x' })
    const conUnoInactivo = [
      ...marcados.slice(0, 2),
      tipo({ id: 'z', activo: false, enLaBarra: true }),
      libre,
    ]
    expect(motivoParaNoMarcar({ tipo: libre, activo: true, tipos: conUnoInactivo })).toBeNull()
  })
})

describe('claveDeTipoCambio', () => {
  it('arma la clave con la forma que exige la base', () => {
    expect(claveDeTipoCambio('Banco Unión')).toBe('banco_union')
    expect(claveDeTipoCambio('  Paralelo  ')).toBe('paralelo')
    expect(claveDeTipoCambio('Dólar blue / venta')).toBe('dolar_blue_venta')
  })

  it('devuelve null si del nombre no sale una clave', () => {
    expect(claveDeTipoCambio('123')).toBeNull()
    expect(claveDeTipoCambio('¡!')).toBeNull()
    expect(claveDeTipoCambio('x')).toBeNull()
  })
})

describe('decimalesDeValor', () => {
  it('usa los decimales que el valor tiene, entre 2 y 6', () => {
    expect(decimalesDeValor(6.96)).toBe(2)
    expect(decimalesDeValor(7)).toBe(2)
    expect(decimalesDeValor(12.405)).toBe(3)
    expect(decimalesDeValor(0.000145)).toBe(6)
  })
})

describe('valorTipeado', () => {
  const valor = (texto: string, locale = 'es-BO') => {
    const leido = valorTipeado(texto, locale)
    return leido.ok ? leido.valor : leido.motivo
  }

  it('lee con el locale de la empresa: la coma decimal y el punto de miles en grupos de 3 (4-25, P5)', () => {
    expect(valor('6,97')).toBe(6.97)
    expect(valor('7')).toBe(7)
    expect(valor(' 12.405 ')).toBe(12405)
    expect(valor('1.234,56')).toBe(1234.56)
    expect(valor('6.96', 'en-US')).toBe(6.96)
  })

  it('un punto fuera de un grupo de 3 dice su aviso', () => {
    expect(valor('6.96')).toBe('Usa coma para los decimales: 6,96.')
  })

  it('rechaza lo que no es un valor mayor que cero con hasta seis decimales', () => {
    for (const texto of ['', '0', '-1', 'siete', '1e3', '1,2345678', '6,9600001']) {
      expect(valor(texto), texto).toBe(VALOR_INVALIDO)
    }
  })
})

describe('textoParaEditar (4.13-3c)', () => {
  it('el valor guardado sale con el decimal del locale, toda su precisión y sin miles', () => {
    expect(textoParaEditar(2.125, 'es-BO')).toBe('2,125')
    expect(textoParaEditar(6.96, 'es-BO')).toBe('6,96')
    expect(textoParaEditar(12405.5, 'es-BO')).toBe('12405,5')
    expect(textoParaEditar(2.125, 'en-US')).toBe('2.125')
  })
})

describe('abrir lo guardado y guardar sin tocar conserva el valor (4.13-3c, C14)', () => {
  it('2,125, 6,96 y 12405,5 en es-BO y en en-US', () => {
    for (const locale of ['es-BO', 'en-US']) {
      for (const valor of [2.125, 6.96, 12405.5]) {
        expect(valorTipeado(textoParaEditar(valor, locale), locale)).toEqual({ ok: true, valor })
      }
    }
  })
})

describe('gruposPorPar', () => {
  it('agrupa por par, los de la moneda base primero y el por defecto adelante', () => {
    const grupos = gruposPorPar(
      [
        tipo({ id: 'a', clave: 'eur', monedaDe: 'EUR', monedaA: 'BOB' }),
        tipo({ id: 'b', clave: 'paralelo' }),
        tipo({ id: 'c', clave: 'oficial', esDefault: true }),
        tipo({ id: 'd', clave: 'viejo', activo: false }),
        tipo({ id: 'e', clave: 'bob', monedaDe: 'BOB', monedaA: 'USD' }),
      ],
      'USD',
    )
    expect(grupos.map((grupo) => grupo.clave)).toEqual(['USD-BOB', 'BOB-USD', 'EUR-BOB'])
    expect(grupos[0]?.tipos.map((uno) => uno.id)).toEqual(['c', 'b', 'd'])
  })

  it('sin tipos no hay grupos', () => {
    expect(gruposPorPar([], 'USD')).toEqual([])
  })
})

describe('parDeLaClave', () => {
  it('lee «USD-BOB» y rechaza lo que no es un par', () => {
    expect(parDeLaClave('USD-BOB')).toEqual({ monedaDe: 'USD', monedaA: 'BOB' })
    expect(parDeLaClave('USD')).toBeNull()
    expect(parDeLaClave('USD-BOB-EUR')).toBeNull()
    expect(parDeLaClave(null)).toBeNull()
  })
})
