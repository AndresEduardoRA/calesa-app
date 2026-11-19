// El id de una celda, fila o columna nueva: el prefijo y el menor número libre en base 36 (`c1`, `c2`… `ca`…). Siempre válido para `ES_ID` (`^[a-z][a-z0-9_]{0,40}$`)
// y a lo sumo de 41 caracteres. Puro.
export type PrefijoDeId = 'c' | 'f' | 'k'

export function idNuevo(prefijo: PrefijoDeId, usados: ReadonlySet<string>): string {
  for (let n = 1; ; n++) {
    const id = `${prefijo}${n.toString(36)}`
    if (!usados.has(id)) return id
  }
}

// Varios ids nuevos seguidos, sin repetir entre ellos.
export function idsNuevos(
  prefijo: PrefijoDeId,
  usados: ReadonlySet<string>,
  cuantos: number,
): string[] {
  const tomados = new Set(usados)
  return Array.from({ length: cuantos }, () => {
    const id = idNuevo(prefijo, tomados)
    tomados.add(id)
    return id
  })
}
