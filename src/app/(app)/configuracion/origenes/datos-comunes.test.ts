import { describe, expect, it, vi } from 'vitest'
import { DATOS_COMUNES } from '@/modules/origenes'
import { camposComunes } from '@/modules/vehiculos'

// Las entradas de servidor traen composición con `server-only`: en Vitest el import llega entero y cae.
vi.mock('server-only', () => ({}))

// `origenes` no depende de `vehiculos`: los datos comunes que puede elegir como datos clave viven espejados en
// `entities/datos-clave.ts`, con el nombre de su columna. Esto los compara con los del vehículo (sin el título ni el bloque del precio).
const COLUMNA: Record<string, string> = { categoriaId: 'categoria_id', urlOrigen: 'url_origen' }

describe('los datos comunes de los datos clave', () => {
  it('son los principales de camposComunes(), en su orden, con su etiqueta y sólo de subasta los mismos', () => {
    const delVehiculo = camposComunes('subasta')
      .filter((campo) => campo.bloque === 'principales' && campo.clave !== 'titulo')
      .map((campo) => ({
        clave: COLUMNA[campo.clave] ?? campo.clave,
        etiqueta: campo.etiqueta,
        soloSubasta: campo.soloSubasta === true,
      }))
    expect(
      DATOS_COMUNES.map((dato) => ({
        clave: dato.clave,
        etiqueta: dato.etiqueta,
        soloSubasta: 'soloSubasta' in dato,
      })),
    ).toEqual(delVehiculo)
  })
})
