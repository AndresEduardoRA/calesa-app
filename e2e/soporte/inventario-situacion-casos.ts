import type { Condicion } from '../../src/modules/vehiculos/entities/filtros'
import type { SituacionPropia } from '../../src/modules/vehiculos/entities/situacion'

// Los casos del filtro «Situación» de la equivalencia del inventario (`vehiculos-inventario-postgrest.spec.ts`): la condición `situacion_en` en sus formas, sobre
// el origen de subasta (que tiene las cuatro situaciones) y sobre el de Corea (fases y «sin fase»).
export type CasoDeSituacion = {
  nombre: string
  origen: 'corea' | 'subasta'
  condiciones: Condicion[]
}

const situacionEn = (
  situaciones: SituacionPropia[],
  fases: string[] = [],
  sinFase = false,
): Condicion => ({ tipo: 'situacion_en', situaciones, fases, sinFase })

export function casosDeSituacion({
  publica,
  interna,
}: {
  publica: string
  interna: string
}): CasoDeSituacion[] {
  const subasta = (nombre: string, ...condiciones: Condicion[]) => ({
    nombre: `«Situación»: ${nombre}`,
    origen: 'subasta' as const,
    condiciones,
  })
  const corea = (nombre: string, ...condiciones: Condicion[]) => ({
    nombre: `«Situación»: ${nombre}`,
    origen: 'corea' as const,
    condiciones,
  })
  return [
    subasta('sin resolver', situacionEn(['sin_resolver'])),
    subasta('no ganadas', situacionEn(['no_ganada'])),
    subasta('las tres propias', situacionEn(['en_subasta', 'sin_resolver', 'no_ganada'])),
    subasta('sin fase', situacionEn([], [], true)),
    subasta('sin resolver y sin fase, y «subasta»', situacionEn(['sin_resolver'], [], true), {
      tipo: 'busqueda',
      texto: 'subasta',
    }),
    corea('una fase', situacionEn([], [publica])),
    corea('una fase y sin fase', situacionEn([], [publica], true)),
    corea('dos fases', situacionEn([], [publica, interna])),
    corea('no ganadas y una fase, con año', situacionEn(['no_ganada'], [publica]), {
      tipo: 'columna_rango',
      columna: 'anio',
      min: 2015,
      max: null,
    }),
  ]
}
