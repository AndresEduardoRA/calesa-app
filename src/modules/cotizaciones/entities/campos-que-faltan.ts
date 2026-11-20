// Los datos del vehículo que una fórmula nombra y el origen no tiene: espejo de `_fdo_campos_que_faltan()` (los nodos `campo_vehiculo` cuyo campo no es una
// columna común ni un campo del origen). Con ellos la planilla marca sus filas; la base no deja publicar ni activar una copia de otro origen así.

// Las columnas de `vehiculos` que todo origen tiene.
export const CAMPOS_COMUNES: readonly string[] = [
  'anio',
  'marca',
  'modelo',
  'kilometraje',
  'precio',
]

// Cuántas claves de campos del origen se leen para saberlo: los de un origen son decenas, y PostgREST corta en 1.000 (`max_rows`).
export const TOPE_DE_CAMPOS_DEL_ORIGEN = 1000

// Si la definición nombra algún dato del vehículo que no es una columna común: sólo entonces hace falta leer los campos del origen.
export function nombraCamposPropios(definicion: { nodos: readonly NodoLeido[] } | null): boolean {
  return camposQueFaltan(definicion, new Set()).length > 0
}

export type CampoQueFalta = { nodo: string; campo: string }

type NodoLeido = { id?: unknown; tipo?: unknown; campo?: unknown }

export function camposQueFaltan(
  definicion: { nodos: readonly NodoLeido[] } | null,
  clavesDelOrigen: ReadonlySet<string>,
): CampoQueFalta[] {
  if (definicion === null) return []
  return definicion.nodos.flatMap((nodo) => {
    if (nodo.tipo !== 'campo_vehiculo' || typeof nodo.id !== 'string') return []
    const campo = typeof nodo.campo === 'string' ? nodo.campo : ''
    if (CAMPOS_COMUNES.includes(campo) || clavesDelOrigen.has(campo)) return []
    return [{ nodo: nodo.id, campo }]
  })
}

// Lo que dice la fila de la planilla que nombra un dato que el origen no tiene.
export const textoDelCampoQueFalta = (campo: string) =>
  `El dato «${campo}» no existe en este origen: elige otro o créalo.`
