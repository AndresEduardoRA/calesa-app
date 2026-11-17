// Composición del área `compras` de `repuestos` en el servidor (8.11-3): une guardar, eliminar y restaurar una compra con su interfaz, y la lectura de las compras de un ítem. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeCompras } from '../../entities/compras/repositorio'
import { comprasSupabase } from '../../infra/compras/escribir'
import { leerComprasDelItem } from '../../infra/compras/listar'

// Las actions de `features/compras/` lo usan.
export const repositorioDeCompras: RepositorioDeCompras = comprasSupabase

// Las compras de un ítem (el bloque del panel del ítem): la usa `leer-compras-del-item`.
export const comprasDelItem = leerComprasDelItem
