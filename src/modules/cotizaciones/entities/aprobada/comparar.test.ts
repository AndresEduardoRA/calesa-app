import { describe, expect, it } from 'vitest'
import {
  compararCotizaciones,
  modoDeLaCotizacion,
  motivoDeLaColumna,
  veredictoDeComparar,
  type ColumnaLeida,
} from './comparar'
import { A, B, C, ORIGEN, OTRO_VEHICULO, PRECIO, VEHICULO, hoja, marca } from './comparar-de-prueba'

describe('modoDeLaCotizacion', () => {
  it('el de su clave; sin clave, el primero; con una clave que la versión no tiene, nada', () => {
    const base = { id: A, numero: 1, secciones: [], valores: {} }
    expect(modoDeLaCotizacion(hoja({ ...base, modoTc: 'm2' }))).toBe('Paralelo')
    expect(modoDeLaCotizacion(hoja({ ...base, modoTc: null }))).toBe('Oficial')
    expect(modoDeLaCotizacion(hoja({ ...base, modoTc: 'otro' }))).toBeNull()
  })
})

describe('veredictoDeComparar', () => {
  const a = hoja({ id: A, numero: 1, secciones: [], valores: {} })
  const b = hoja({ id: B, numero: 2, secciones: [], valores: {} })
  const columnas: ColumnaLeida[] = [
    { id: A, hoja: a },
    { id: B, hoja: b },
  ]

  it('del mismo vehículo y todas vistas: se comparan', () => {
    expect(veredictoDeComparar({ columnas, marcas: [marca(A, 1), marca(B, 2)] })).toEqual({
      tipo: 'se_comparan',
      vehiculoId: VEHICULO,
    })
  })

  it('un 42501 en una columna no se compara; un fallo sí', () => {
    const marcas = [marca(A, 1), marca(B, 2)]
    expect(
      veredictoDeComparar({ columnas: [columnas[0]!, { id: B, error: 'sin_permiso' }], marcas }),
    ).toEqual({ tipo: 'no_se_comparan' })
    expect(
      veredictoDeComparar({ columnas: [columnas[0]!, { id: B, error: 'fallo' }], marcas }).tipo,
    ).toBe('se_comparan')
  })

  it('una marca que no llegó (la RLS la esconde), sin vehículo o de dos vehículos: no se comparan', () => {
    expect(veredictoDeComparar({ columnas, marcas: [marca(A, 1)] }).tipo).toBe('no_se_comparan')
    expect(
      veredictoDeComparar({ columnas, marcas: [marca(A, 1), marca(B, 2, { vehiculoId: null })] })
        .tipo,
    ).toBe('no_se_comparan')
    expect(
      veredictoDeComparar({
        columnas,
        marcas: [marca(A, 1), marca(B, 2, { vehiculoId: OTRO_VEHICULO })],
      }).tipo,
    ).toBe('no_se_comparan')
  })
})

describe('compararCotizaciones', () => {
  it('las cabeceras: título, autor, versión, total contra la primera, modo, y la aprobada', () => {
    const a = hoja({
      id: A,
      numero: 1,
      secciones: [PRECIO],
      valores: { fob: 1, flete: 2 },
      total: 100,
      version: 3,
    })
    const b = hoja({
      id: B,
      numero: 2,
      secciones: [PRECIO],
      valores: { fob: 1, flete: 2 },
      total: 90,
      titulo: 'Con descuento',
      modoTc: 'm2',
    })
    const modelo = compararCotizaciones(
      {
        columnas: [
          { id: A, hoja: a },
          { id: B, hoja: b },
          { id: C, error: 'fallo' },
        ],
        marcas: [marca(A, 1), marca(B, 2, { aprobada: true, autor: 'Ana' }), marca(C, 3)],
      },
      VEHICULO,
      'Toyota Hilux 2020',
    )
    expect(modelo.aprobadaId).toBe(B)
    expect(modelo.columnas).toMatchObject([
      {
        tipo: 'cotizacion',
        numero: 1,
        titulo: 'Toyota Hilux 2020',
        versionDeLaFormula: 3,
        total: { valor: 100, diferencia: 'igual', moneda: 'USD' },
        modo: 'Oficial',
      },
      {
        tipo: 'cotizacion',
        numero: 2,
        titulo: 'Con descuento',
        autor: 'Ana',
        total: { valor: 90, diferencia: 'menos' },
        modo: 'Paralelo',
      },
      { tipo: 'error', id: C, numero: 3 },
    ])
    // Plano: nada de `Map` cruza al navegador.
    expect(JSON.parse(JSON.stringify(modelo))).toEqual(modelo)
  })
})

describe('motivoDeLaColumna', () => {
  const columna = { origenId: ORIGEN, origen: 'Japón', estado: 'activa' as const }

  it('sin permiso en el origen, el pedido con el nombre del origen', () => {
    expect(motivoDeLaColumna(columna, [])).toBe(
      'Para aprobar hace falta permiso en «Japón»: pídeselo a quien administra los roles.',
    )
  })

  it('inválida no se aprueba; con permiso, nada', () => {
    expect(motivoDeLaColumna({ ...columna, estado: 'invalida' }, 'todos')).toBe(
      'Una cotización inválida no se aprueba.',
    )
    expect(motivoDeLaColumna(columna, [ORIGEN])).toBeNull()
  })
})
