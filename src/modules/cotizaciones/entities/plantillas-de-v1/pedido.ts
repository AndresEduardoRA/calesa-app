// Lo que viaja a `cotizacion_paquete_aplicar()` como `p_paquete`: la plantilla ya con las claves de color del catálogo (`plantillaConClaves()`), la nota de los
// dos borradores, los colores que se reusan (la base vuelve a mirar su hex bajo el candado) y los que se crean, cada uno con el id del intento (repetir el
// pedido no duplica: `tono_crear` es idempotente por id). Pura.
import type { PlanDeColores } from './colores'
import type { PlantillaDeV1 } from './tipos'

export type PedidoDePaquete = {
  readonly definicion: PlantillaDeV1['formula']['definicion']
  readonly params: PlantillaDeV1['formula']['params']
  readonly diseno: PlantillaDeV1['formula']['diseno']
  readonly tarjeta: PlantillaDeV1['tarjeta']
  readonly nota: string
  readonly reusar: readonly { readonly clave: string; readonly hex: string }[]
  readonly crear: readonly {
    readonly id: string
    readonly nombre: string
    readonly hex: string
    readonly clave: string
  }[]
}

export const notaDeLaPlantilla = (nombre: string) =>
  `Empezado desde la plantilla de V1 «${nombre}».`

export function pedidoDeLaPlantilla(
  plantilla: Pick<PlantillaDeV1, 'nombre' | 'formula' | 'tarjeta'>,
  colores: Extract<PlanDeColores, { ok: true }>,
  ids: readonly string[],
): PedidoDePaquete {
  if (ids.length !== colores.crear.length) {
    throw new Error(`Hacen falta ${colores.crear.length} ids, uno por color nuevo.`)
  }
  return {
    definicion: plantilla.formula.definicion,
    params: plantilla.formula.params,
    diseno: plantilla.formula.diseno,
    tarjeta: plantilla.tarjeta,
    nota: notaDeLaPlantilla(plantilla.nombre),
    reusar: colores.reusar,
    crear: colores.crear.map((c, i) => ({
      id: ids[i] ?? '',
      nombre: c.nombre,
      hex: c.hex,
      clave: c.clave,
    })),
  }
}

// Lo que la action le pide a la base y lo que vuelve: las versiones nuevas de los dos borradores, como el texto de la base.
export type PedidoDeAplicar = {
  readonly origenId: string
  // La fórmula del origen que recibe los borradores.
  readonly formulaDelOrigenId: string
  readonly pedido: PedidoDePaquete
  readonly formulaEsperada: string | null
  readonly plantillaEsperada: string | null
}
export type Aplicada = { readonly formula: string; readonly plantilla: string }
