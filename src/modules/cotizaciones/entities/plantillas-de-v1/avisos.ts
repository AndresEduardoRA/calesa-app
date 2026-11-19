// Lo que el origen o la empresa no tienen y una plantilla de V1 lee, dicho en el paso de confirmar sin bloquear: los borradores se crean igual. Pura.
// docs/UX.md › «Cotización: empezar desde una plantilla (estados propios)».
import type { PlantillaDeV1 } from './tipos'

// Las columnas del vehículo que todo origen tiene: no son campos del origen (`docs/COTIZADOR.md` › «En la base», «Qué lee»).
export const COLUMNAS_FIJAS_DEL_VEHICULO = [
  'anio',
  'marca',
  'modelo',
  'kilometraje',
  'precio',
] as const

export type LoQueHay = {
  // Las claves de los tipos de cambio activos de la empresa.
  readonly tiposDeCambio: readonly string[]
  // Las claves de los campos activos del origen.
  readonly campos: readonly string[]
  // El nombre del origen, como lo dice el aviso.
  readonly origen: string
}

export function avisosDeLaPlantilla(
  plantilla: Pick<PlantillaDeV1, 'tiposDeCambio' | 'camposDelVehiculo'>,
  hay: LoQueHay,
): string[] {
  const tipos = new Set(hay.tiposDeCambio)
  const campos = new Set<string>([...hay.campos, ...COLUMNAS_FIJAS_DEL_VEHICULO])
  return [
    ...plantilla.tiposDeCambio
      .filter((t) => !tipos.has(t.clave))
      .map(
        (t) =>
          `Este paquete usa el tipo de cambio «${t.nombre}», que la empresa no tiene: créalo en Empresa › Monedas antes de publicar.`,
      ),
    ...plantilla.camposDelVehiculo
      .filter((c) => !campos.has(c.clave))
      .map(
        (c) =>
          `Este paquete lee «${c.nombre}», que ${hay.origen} no tiene: esas celdas valdrán 0 hasta sumarlo en Orígenes › Campos.`,
      ),
  ]
}

// Lo que la fórmula de un paquete lee de afuera: las claves de sus tipos de cambio y los campos del vehículo (`campo_vehiculo` y el `match` de una tabla que
// no nombra un nodo). Lo usa la prueba que fija que `tiposDeCambio` y `camposDelVehiculo` del paquete dicen la verdad.
export function loQueLeeLaFormula(plantilla: Pick<PlantillaDeV1, 'formula'>): {
  tiposDeCambio: string[]
  campos: string[]
} {
  const nodos = plantilla.formula.definicion.nodos
  const ids = new Set(nodos.map((n) => n.id))
  const campos = new Set<string>()
  const tipos = new Set<string>()
  for (const n of nodos) {
    if (n.tipo === 'tipo_cambio') tipos.add(n.clave)
    if (n.tipo === 'campo_vehiculo') campos.add(n.campo)
    if (n.tipo === 'tabla') for (const v of Object.values(n.match)) if (!ids.has(v)) campos.add(v)
  }
  return { tiposDeCambio: [...tipos], campos: [...campos] }
}
