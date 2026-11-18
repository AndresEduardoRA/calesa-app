// Lo que limpian los e2e del catálogo de colores (la tabla `tonos`): los colores que crea la prueba (su nombre empieza con «Color e2e») salen por SQL, por si el
// recorrido se corta antes de eliminarlos con la pantalla. Los tres de fábrica no se tocan.
import { sql } from './sql'

export const PREFIJO_DE_COLOR_DE_PRUEBA = 'Color e2e'

export function borrarColoresDePrueba(): void {
  sql(`delete from public.tonos where nombre like '${PREFIJO_DE_COLOR_DE_PRUEBA}%'`)
}
