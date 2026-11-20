// El catálogo de tablas que BUSCARV puede nombrar al compilar una fila (`ContextoDeCompilacion.tablas`): las activas del origen y las
// compartidas, una por clave. Si una del origen y una compartida tienen la misma clave manda la del origen, la misma que congela la
// publicación (`params.tablas`): si no, el compilador revisaría una tabla y la cotización usaría otra.
import type { TablaDelCatalogo } from '../compilador'

// Como la lista de tablas del área `tablas` (que este área no importa): decenas de filas de configuración.
export const TOPE_DE_TABLAS_DEL_CATALOGO = 100

export type TablaLeida = { clave: string; compartida: boolean; columnas: string[] }

// Una por clave, la del origen antes que la compartida, en el orden en que llegaron.
export function catalogoDe(tablas: readonly TablaLeida[]): TablaDelCatalogo[] {
  const propias = new Set(tablas.filter((t) => !t.compartida).map((t) => t.clave))
  const vistas = new Set<string>()
  const catalogo: TablaDelCatalogo[] = []
  for (const t of tablas) {
    if (vistas.has(t.clave) || (t.compartida && propias.has(t.clave))) continue
    vistas.add(t.clave)
    catalogo.push({ clave: t.clave, columnas: t.columnas })
  }
  return catalogo
}
