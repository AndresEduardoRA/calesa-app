// Los `searchParams` de una página, como `URLSearchParams`: cada valor, también los que se repiten. Las reglas de las URLs viejas de Configuración ›
// Leads (`?seccion=` y las seis sub-rutas) están en `@/modules/leads` (`destinoDeLaSeccionVieja`, `destinoDeLaSubrutaVieja`).
export function comoBusqueda(
  parametros: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const busqueda = new URLSearchParams()
  for (const [nombre, valor] of Object.entries(parametros)) {
    for (const uno of Array.isArray(valor) ? valor : valor === undefined ? [] : [valor]) {
      busqueda.append(nombre, uno)
    }
  }
  return busqueda
}
