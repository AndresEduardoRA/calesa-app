// La unidad de ejemplo de la planilla de la fórmula (glosario: «Unidad de ejemplo»): lo que se tipea en la banda «Unidad de ejemplo» para ver el efecto de cada
// cambio (los `input`, los campos del vehículo, las banderas y la variante). No se guarda: vive en la memoria de la pestaña y arranca en ceros, como las cifras de
// prueba (`entradaDePrueba()`). Puro: lo que llega al motor pasa por `entradaDeLaUnidad()`, que suelta lo que la fórmula de trabajo ya no tiene (el motor lanza
// `entrada_invalida` si lo tipeado nombra un nodo que no es un `input` o una bandera).
import type { ModoDeCambio, Formula } from '../formula'
import type { ModoDeTipoDeCambio } from '../diseno'

export type ValorDelVehiculo = number | string | null

export type UnidadDeEjemplo = {
  // Por id de nodo `input`.
  inputs: Readonly<Record<string, number>>
  // Por id de nodo `bandera`; lo que no está, apagada.
  banderas: Readonly<Record<string, boolean>>
  // Por campo del vehículo (`anio`), como lo lee el motor.
  vehiculo: Readonly<Record<string, ValorDelVehiculo>>
  // La clave elegida de la variante; sin ella, la por defecto.
  variante?: string
}

// Los datos en 0, las banderas apagadas y la variante por defecto: lo de `entradaDePrueba()`.
export const UNIDAD_EN_CEROS: UnidadDeEjemplo = { inputs: {}, banderas: {}, vehiculo: {} }

const propias = <V>(
  registro: Readonly<Record<string, V>>,
  admitidas: ReadonlySet<string>,
): Record<string, V> =>
  Object.fromEntries(Object.entries(registro).filter(([clave]) => admitidas.has(clave)))

// Lo de la unidad que la fórmula todavía tiene: cada `input` y cada bandera por su id, cada campo del vehículo que nombra un `campo_vehiculo`, y la variante si es
// una de sus opciones. Un recorrido de los nodos.
export function entradaDeLaUnidad(formula: Formula, unidad: UnidadDeEjemplo): UnidadDeEjemplo {
  const inputs = new Set<string>()
  const banderas = new Set<string>()
  const campos = new Set<string>()
  const opciones = new Set<string>()
  for (const n of formula.definicion.nodos) {
    if (n.tipo === 'input') inputs.add(n.id)
    else if (n.tipo === 'bandera') banderas.add(n.id)
    else if (n.tipo === 'campo_vehiculo') campos.add(n.campo)
    else if (n.tipo === 'opcion') for (const o of n.opciones) opciones.add(o.clave)
  }
  const { variante } = unidad
  return {
    inputs: propias(unidad.inputs, inputs),
    banderas: propias(unidad.banderas, banderas),
    vehiculo: propias(unidad.vehiculo, campos),
    ...(variante !== undefined && opciones.has(variante) ? { variante } : {}),
  }
}

// El modo del diseño (`{clave, nombre, buckets: [{bucket, nodo}], total_en}`) como lo recibe el motor: el mismo mapa que `buckets` y `total_en` de la fórmula.
export function modoDelMotor(modo: Pick<ModoDeTipoDeCambio, 'buckets' | 'total_en'>): ModoDeCambio {
  return {
    buckets: Object.fromEntries(modo.buckets.map((b) => [b.bucket, b.nodo])),
    total_en: modo.total_en,
  }
}
