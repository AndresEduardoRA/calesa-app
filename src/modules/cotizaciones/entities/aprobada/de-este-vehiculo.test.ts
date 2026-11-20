import { describe, expect, it } from 'vitest'
import { TOPE_DE_ESTE_VEHICULO } from '@/shared/lib/paginacion'
import { ES_INVALIDA } from './acceso'
import {
  filasALaVista,
  hayOtras,
  motivoParaNoAprobarEsta,
  paginaDeEsteVehiculoDesde,
  sinPermisoEn,
  textoDeLaLinea,
  tituloDeLaFila,
  type FilaDeEsteVehiculo,
} from './de-este-vehiculo'

const ORIGEN = '00000000-0000-4000-8000-0000000000a1'
const OTRO = '00000000-0000-4000-8000-0000000000a2'

const idDe = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function fila(n: number, extra: Partial<FilaDeEsteVehiculo> = {}): FilaDeEsteVehiculo {
  return {
    id: idDe(n),
    numero: n,
    origenId: ORIGEN,
    origen: 'Japón',
    clase: 'preventa',
    estado: 'activa',
    titulo: null,
    totalBase: 1000,
    monedaMostrar: null,
    modo: null,
    autor: 'Ana',
    creadoEn: '2026-11-17T10:00:00.123456+00:00',
    actualizadoEn: '2026-11-17T10:00:00.123456+00:00',
    vencida: false,
    venceEl: '2026-11-27',
    aprobada: false,
    privada: false,
    ...extra,
  }
}

// Una fila como la devuelve la RPC.
function cruda(n: number, extra: Record<string, unknown> = {}) {
  return {
    id: idDe(n),
    numero: n,
    origen_id: ORIGEN,
    origen: 'Japón',
    clase: 'preventa',
    estado: 'activa',
    titulo: null,
    total: 1000,
    moneda: 'USD',
    modo: 'Paralelo',
    autor: 'Ana',
    creado_en: '2026-11-17T10:00:00.123456+00:00',
    editada_en: '2026-11-17T10:00:00.654321+00:00',
    vencida: false,
    vence_el: '2026-11-27',
    aprobada: false,
    fijada: false,
    privada: false,
    ...extra,
  }
}

describe('lectura de «De este vehículo»', () => {
  it('separa la fijada de la página y deja la versión como la dio la base', () => {
    const pagina = paginaDeEsteVehiculoDesde([
      cruda(1, { aprobada: true, fijada: true }),
      cruda(3),
      cruda(2),
    ])
    expect(pagina?.fijada?.id).toBe(idDe(1))
    expect(pagina?.filas.map((f) => f.numero)).toEqual([3, 2])
    expect(pagina?.filas[0]?.actualizadoEn).toBe('2026-11-17T10:00:00.654321+00:00')
    expect(pagina?.filas[0]?.modo).toBe('Paralelo')
  })

  it('trae la marca de privada de cada fila', () => {
    const pagina = paginaDeEsteVehiculoDesde([cruda(2, { privada: true }), cruda(1)])
    expect(pagina?.filas.map((f) => f.privada)).toEqual([true, false])
    expect(paginaDeEsteVehiculoDesde([cruda(1, { privada: undefined })])).toBeNull()
  })

  it('una fila con forma mala hace de la lectura un error', () => {
    expect(paginaDeEsteVehiculoDesde([cruda(1, { clase: 'otra' })])).toBeNull()
    expect(paginaDeEsteVehiculoDesde({ filas: [] })).toBeNull()
  })
})

describe('el orden: la aprobada siempre primera', () => {
  it('la fijada (que puede estar en la página 3) va primero', () => {
    const fijada = fila(1, { aprobada: true })
    const vistas = filasALaVista({ fijada, filas: [fila(9), fila(8)] })
    expect(vistas.map((f) => f.numero)).toEqual([1, 9, 8])
  })

  it('la aprobada repetida en una página posterior no se dibuja dos veces', () => {
    const fijada = fila(1, { aprobada: true })
    const vistas = filasALaVista({
      fijada,
      filas: [fila(3), fila(2), fila(1, { aprobada: true })],
    })
    expect(vistas.map((f) => f.numero)).toEqual([1, 3, 2])
  })

  it('sin fijada, sube la que dice ser la aprobada; sin aprobada, el orden de la base', () => {
    expect(
      filasALaVista({ fijada: null, filas: [fila(3), fila(2, { aprobada: true })] }).map(
        (f) => f.numero,
      ),
    ).toEqual([2, 3])
    expect(filasALaVista({ fijada: null, filas: [fila(3), fila(2)] }).map((f) => f.numero)).toEqual(
      [3, 2],
    )
  })

  it('nunca dibuja más del tope', () => {
    const filas = Array.from({ length: TOPE_DE_ESTE_VEHICULO + 5 }, (_, i) => fila(i + 2))
    expect(filasALaVista({ fijada: fila(1, { aprobada: true }), filas })).toHaveLength(
      TOPE_DE_ESTE_VEHICULO,
    )
  })
})

describe('hayOtras', () => {
  it('sólo la que se mira, o ninguna: no hay otras', () => {
    expect(hayOtras([fila(1)], idDe(1))).toBe(false)
    expect(hayOtras([], idDe(1))).toBe(false)
  })

  it('con dos, o sin cotización actual (la ficha del vehículo), sí', () => {
    expect(hayOtras([fila(1), fila(2)], idDe(1))).toBe(true)
    expect(hayOtras([fila(1)])).toBe(true)
  })
})

describe('el motivo de «Aprobar esta»', () => {
  it('sin el permiso del origen, lo pide nombrando el origen (o «este origen» sin nombre)', () => {
    expect(motivoParaNoAprobarEsta(fila(1), [OTRO])).toBe(
      'Para aprobar hace falta permiso en «Japón»: pídeselo a quien administra los roles.',
    )
    expect(motivoParaNoAprobarEsta(fila(1, { origen: null }), [])).toBe(sinPermisoEn(null))
    expect(sinPermisoEn(null)).toContain('en este origen')
  })

  it('con el permiso en todos o en su origen, se puede; la vencida también', () => {
    expect(motivoParaNoAprobarEsta(fila(1), 'todos')).toBeNull()
    expect(motivoParaNoAprobarEsta(fila(1), [ORIGEN])).toBeNull()
    expect(motivoParaNoAprobarEsta(fila(1, { vencida: true }), 'todos')).toBeNull()
  })

  it('la inválida no se aprueba, y el permiso se dice antes, como la base', () => {
    const invalida = fila(1, { estado: 'invalida' })
    expect(motivoParaNoAprobarEsta(invalida, 'todos')).toBe(ES_INVALIDA)
    expect(motivoParaNoAprobarEsta(invalida, [OTRO])).toBe(sinPermisoEn('Japón'))
  })
})

describe('la línea bajo la cabecera', () => {
  it('sin otras, nada; una en singular; varias y el tope en plural', () => {
    expect(textoDeLaLinea({ n: 0, hayMas: false })).toBeNull()
    expect(textoDeLaLinea({ n: 1, hayMas: false })).toBe('Hay 1 cotización más de este vehículo')
    expect(textoDeLaLinea({ n: 2, hayMas: false })).toBe('Hay 2 cotizaciones más de este vehículo')
    expect(textoDeLaLinea({ n: 100, hayMas: true })).toBe(
      'Hay más de 100 cotizaciones más de este vehículo',
    )
  })
})

describe('el título de una fila', () => {
  it('el suyo, si no el del vehículo, si no el número', () => {
    expect(tituloDeLaFila({ titulo: 'Corolla de Juan', numero: 7 }, 'Toyota Corolla')).toBe(
      'Corolla de Juan',
    )
    expect(tituloDeLaFila({ titulo: '  ', numero: 7 }, 'Toyota Corolla')).toBe('Toyota Corolla')
    expect(tituloDeLaFila({ titulo: null, numero: 7 }, null)).toBe('Cotización n.º 7')
  })
})
