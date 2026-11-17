import { describe, expect, it } from 'vitest'
import {
  cursorDeLaFila,
  gruposALaVista,
  textoDeOcultos,
  todoVacio,
  type GrupoDeRelacionados,
  type LeadRelacionado,
} from './relacionados'

const lead: LeadRelacionado = {
  leadId: 'lead-1',
  nombre: 'Ana',
  numeros: { numero: null, numeroPropio: null, creadorDelPropio: null },
  enCartera: true,
  puedoActuar: true,
}
const grupo = (filas: number, ocultos: number): GrupoDeRelacionados<LeadRelacionado> => ({
  tipo: 'interesado',
  filas: Array.from({ length: filas }, () => ({
    contraparte: lead,
    detalle: { tipo: 'interesado' as const, nota: null, creadoEn: 'x', porNombre: null },
  })),
  conteo: { n: filas + ocultos, hayMas: false },
  ocultos,
  hayMas: false,
})

describe('textoDeOcultos', () => {
  it('dice cuántos no se ven', () => {
    expect(textoDeOcultos(1)).toBe('1 que no puedes ver')
    expect(textoDeOcultos(3)).toBe('3 que no puedes ver')
  })
})

describe('todoVacio', () => {
  it('sólo con todos los grupos sin filas ni ocultos; un grupo ausente no cuenta', () => {
    expect(todoVacio({ vinculado: grupo(0, 0), interesado: grupo(0, 0), cotizado: null })).toBe(
      true,
    )
    expect(todoVacio({ vinculado: grupo(0, 0), interesado: grupo(0, 1), cotizado: null })).toBe(
      false,
    )
    expect(
      todoVacio({ vinculado: grupo(0, 0), interesado: grupo(0, 0), cotizado: grupo(1, 0) }),
    ).toBe(false)
  })
})

describe('gruposALaVista', () => {
  const de = (
    tipo: GrupoDeRelacionados<LeadRelacionado>['tipo'],
    filas: number,
    ocultos: number,
  ) => ({
    ...grupo(filas, ocultos),
    tipo,
  })
  it('quita los que no existen y los vacíos', () => {
    expect(
      gruposALaVista({
        vinculado: de('vinculado', 0, 0),
        interesado: de('interesado', 2, 0),
        cotizado: null,
      }).map((uno) => uno.tipo),
    ).toEqual(['interesado'])
  })
  it('conserva un grupo con sólo lo que no se ve', () => {
    expect(
      gruposALaVista({
        vinculado: de('vinculado', 0, 1),
        interesado: de('interesado', 0, 0),
        cotizado: null,
      }).map((uno) => uno.tipo),
    ).toEqual(['vinculado'])
  })
  it('respeta el orden Vinculado, Interesado, Cotizado', () => {
    expect(
      gruposALaVista({
        vinculado: de('vinculado', 1, 0),
        interesado: de('interesado', 1, 0),
        cotizado: de('cotizado', 1, 0),
      }).map((uno) => uno.tipo),
    ).toEqual(['vinculado', 'interesado', 'cotizado'])
  })
})

describe('cursorDeLaFila', () => {
  it('el cursor de una cotización es el de la cotización, no el del lead', () => {
    expect(
      cursorDeLaFila({
        contraparte: lead,
        detalle: {
          tipo: 'cotizado',
          cotizacion: { id: 'c1', numero: 1, clase: 'preventa', creadoEn: 'T' },
        },
      }),
    ).toEqual({ en: 'T', id: 'c1' })
  })
  it('el de un interesado es su fecha y el lead; el de un vínculo, su «desde»', () => {
    expect(
      cursorDeLaFila({
        contraparte: lead,
        detalle: { tipo: 'interesado', nota: null, creadoEn: 'T', porNombre: null },
      }),
    ).toEqual({ en: 'T', id: 'lead-1' })
    expect(
      cursorDeLaFila({ contraparte: lead, detalle: { tipo: 'vinculado', desde: 'D' } }),
    ).toEqual({ en: 'D', id: 'lead-1' })
  })
})
