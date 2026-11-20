import type { Condicion } from '../../src/modules/vehiculos/entities/filtros'
import type { SituacionPropia } from '../../src/modules/vehiculos/entities/situacion'
import {
  ventanaDelCierre,
  type VentanaDelCierre,
} from '../../src/modules/vehiculos/entities/ventana-del-cierre'
import { ZONA_POR_DEFECTO } from '../../src/shared/lib/fechas'

// Los casos de la situación (la condición que usa «Subasta» y la de siempre) de la equivalencia del inventario (`vehiculos-inventario-postgrest.spec.ts`): la condición `situacion_en` en sus formas, sobre
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

// Los casos de «Subasta» y «Fase»: `cierre_entre` con las tres ventanas de verdad, calculadas ahora en la zona de la empresa (sólo las vivas: la «abierta» con el
// cierre pasado no entra), y la fase como columna (`columna_en fase_id`) en Corea: una, sólo «Sin fase» y las dos con «Sin fase».
export function casosDeSubasta({
  publica,
  interna,
}: {
  publica: string
  interna: string
}): CasoDeSituacion[] {
  const ahora = new Date().toISOString()
  const cierre = (ventana: VentanaDelCierre): CasoDeSituacion => ({
    nombre: `«Subasta»: cierra ${ventana}`,
    origen: 'subasta',
    condiciones: [{ tipo: 'cierre_entre', ...ventanaDelCierre(ventana, ahora, ZONA_POR_DEFECTO) }],
  })
  const fase = (nombre: string, valores: string[], incluirNulo: boolean): CasoDeSituacion => ({
    nombre: `«Fase»: ${nombre}`,
    origen: 'corea',
    condiciones: [{ tipo: 'columna_en', columna: 'fase_id', valores, incluirNulo }],
  })
  return [
    cierre('hoy'),
    cierre('48h'),
    cierre('semana'),
    {
      nombre: '«Subasta»: cierra hoy, sin las no ganadas, y «viva»',
      origen: 'subasta',
      condiciones: [
        { tipo: 'cierre_entre', ...ventanaDelCierre('hoy', ahora, ZONA_POR_DEFECTO) },
        { tipo: 'situacion_fuera_de', valores: ['no_ganada'] },
        { tipo: 'busqueda', texto: 'viva' },
      ],
    },
    fase('una', [publica], false),
    fase('sin fase', [], true),
    fase('las dos y sin fase', [publica, interna], true),
  ]
}
