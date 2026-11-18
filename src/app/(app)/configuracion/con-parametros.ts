// Los parámetros de una página de Configuración tal como los entrega Next (`searchParams`).
export type ParametrosDeLaUrl = Record<string, string | string[] | undefined>

// La ruta con los parámetros de la URL vieja que siguen valiendo: todos menos `seccion`, que era la pestaña y ahora es la ruta. Los
// `?panel=` (con lo que cada uno lleva: `puerto`, `valor`, `tramo`…) siguen abriendo lo suyo en la sub-ruta nueva. Un parámetro repetido
// se conserva repetido; sin parámetros, la ruta sola.
export function conParametros(ruta: string, parametros: ParametrosDeLaUrl): string {
  const conservados = new URLSearchParams()
  for (const [nombre, valor] of Object.entries(parametros)) {
    if (nombre === 'seccion' || valor === undefined) {
      continue
    }
    for (const uno of Array.isArray(valor) ? valor : [valor]) {
      conservados.append(nombre, uno)
    }
  }
  const busqueda = conservados.toString()
  return busqueda === '' ? ruta : `${ruta}?${busqueda}`
}
