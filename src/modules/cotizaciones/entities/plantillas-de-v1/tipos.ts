// La forma de una plantilla de V1, sin datos: la importan los paquetes (`index.ts`) y las reglas puras de esta carpeta. docs/COTIZADOR.md › «Plantillas de V1».
import type { PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import type { Diseno } from '../diseno'
import type { Definicion } from '../formula'
import type { ClaveDePlantillaDeV1 } from './claves'

// Un color que nombran los grupos, el diseño o la tarjeta: la clave es la de `_tono_clave(nombre)` y el hex, en minúsculas (`^#[0-9a-f]{6}$`).
export type ColorDePlantillaDeV1 = {
  readonly clave: string
  readonly nombre: string
  readonly hex: string
}

// Lo que el paquete lee de afuera, con el nombre que dice el aviso.
export type NombradoPorLaPlantilla = { readonly clave: string; readonly nombre: string }

// La unidad de ejemplo de V1 (`defaultSampleUnit()`) con los tipos de cambio de su `app_settings`: sólo la usan las pruebas.
export type UnidadDePlantillaDeV1 = {
  readonly inputs: Readonly<Record<string, number>>
  readonly banderas: Readonly<Record<string, boolean>>
  readonly variante?: string
  readonly vehiculo: Readonly<Record<string, number | string>>
  readonly overrides: Readonly<Record<string, number>>
  readonly tipos_cambio: Readonly<Record<string, number>>
}

export type PlantillaDeV1 = {
  readonly clave: ClaveDePlantillaDeV1
  readonly nombre: string
  readonly frase: string
  readonly formula: {
    readonly definicion: Definicion
    // Plano, como lo guarda la base: `{ <constante>: número, tablas?: {…} }`.
    readonly params: Readonly<Record<string, unknown>>
    readonly diseno: Diseno
  }
  readonly tarjeta: PlantillaEnCuadricula
  readonly colores: readonly ColorDePlantillaDeV1[]
  readonly unidad: UnidadDePlantillaDeV1
  readonly camposDelVehiculo: readonly NombradoPorLaPlantilla[]
  readonly tiposDeCambio: readonly NombradoPorLaPlantilla[]
}
