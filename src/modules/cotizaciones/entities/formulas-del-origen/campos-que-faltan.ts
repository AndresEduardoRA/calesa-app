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
