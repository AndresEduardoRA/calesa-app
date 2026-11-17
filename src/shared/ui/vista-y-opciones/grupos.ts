import type { GrupoDeVistaYOpciones } from './tipos'

// «Ítems por página» va después del último grupo que dice lo que se está viendo (los que tienen `resumen`) y antes de lo que se puede
// hacer («Vistas guardadas», «Más»): así se lee primero qué estás viendo y después qué puedes hacer.
export function ordenarConPorPagina(
  opciones: readonly GrupoDeVistaYOpciones[],
  porPagina: GrupoDeVistaYOpciones | null,
): readonly GrupoDeVistaYOpciones[] {
  if (porPagina === null) {
    return opciones
  }
  let despues = 0
  opciones.forEach((grupo, indice) => {
    if (grupo.resumen !== undefined) {
      despues = indice + 1
    }
  })
  return [...opciones.slice(0, despues), porPagina, ...opciones.slice(despues)]
}

// Lo que el botón dice de lo activo, en el orden de los grupos.
export function resumenDe(grupos: readonly GrupoDeVistaYOpciones[]): string[] {
  return grupos.flatMap((grupo) => (grupo.resumen === undefined ? [] : [grupo.resumen]))
}
