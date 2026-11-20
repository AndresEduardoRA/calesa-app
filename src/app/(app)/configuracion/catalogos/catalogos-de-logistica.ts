// Los catálogos de logística de Configuración › Catálogos (6.01). Cada área llena los suyos en su archivo de `pantallas/` (`CATALOGOS_DE_TRANSPORTE`, 6.08; `CATALOGOS_DE_DINERO`, 6.11)
// y se juntan aquí, así este archivo no se vuelve a editar. Un catálogo no existe hasta que su paso lo llena: nunca una sub-ruta muerta.
import { CATALOGOS_DE_DINERO } from '@/modules/logistica/pantallas/dinero-catalogos'
import { CATALOGOS_DE_TRANSPORTE } from '@/modules/logistica/pantallas/transporte-catalogos'
import type { CatalogoDeLogistica } from '@/modules/logistica'
import { puede, type Permisos } from '@/shared/lib/permisos'

export const CATALOGOS_DE_LOGISTICA: readonly CatalogoDeLogistica[] = [
  ...CATALOGOS_DE_TRANSPORTE,
  ...CATALOGOS_DE_DINERO,
]

// Los catálogos que esta persona puede abrir, en su orden (permiso de cada uno, en algún origen: son de la empresa). Una clave repetida deja el primero.
export function catalogosVisibles(
  permisos: Permisos,
  lista: readonly CatalogoDeLogistica[] = CATALOGOS_DE_LOGISTICA,
): CatalogoDeLogistica[] {
  const vistas = new Set<string>()
  return lista.filter((catalogo) => {
    if (vistas.has(catalogo.clave) || !puede(permisos, catalogo.permiso)) {
      return false
    }
    vistas.add(catalogo.clave)
    return true
  })
}
