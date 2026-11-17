// Las acciones de «Relacionados» que no tienen dónde ir porque su grupo no se dibuja (un grupo vacío no se dibuja: `gruposALaVista()`). No se pierden: van al «⋯» del bloque o de la
// línea. Con todo vacío se ve la frase y una sola acción (`principal`); el resto, al «⋯». Los permisos salen de `accionesDelGrupo()` y `accionesDeTodoVacio()`. Cero I/O.
import {
  accionesDeTodoVacio,
  accionesDelGrupo,
  type AccionDeRelacionados,
  type ContextoDeAcciones,
} from './acciones-de-relacionados'
import { gruposALaVista, type GruposDeRelacionados } from './relacionados'

export type AccionesFueraDeLosGrupos = {
  // Con todo vacío, la acción que se ve junto a la frase; null si no hay o si hay grupos a la vista.
  principal: AccionDeRelacionados | null
  // Las que van al «⋯» del bloque o de la línea.
  resto: AccionDeRelacionados[]
}

export function accionesFueraDeLosGrupos(
  grupos: GruposDeRelacionados<unknown>,
  contexto: ContextoDeAcciones,
): AccionesFueraDeLosGrupos {
  if (gruposALaVista(grupos).length === 0) {
    const [principal = null, ...resto] = accionesDeTodoVacio(contexto)
    return { principal, resto }
  }
  const vacios = [grupos.vinculado, grupos.interesado, grupos.cotizado].filter(
    (grupo) => grupo !== null && grupo.filas.length === 0 && grupo.ocultos === 0,
  )
  return {
    principal: null,
    resto: vacios.flatMap((grupo) =>
      grupo === null ? [] : accionesDelGrupo({ tipo: grupo.tipo, filas: 0, ocultos: 0 }, contexto),
    ),
  }
}
