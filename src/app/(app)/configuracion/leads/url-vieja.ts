import { SUBSECCIONES_DE_LEADS } from './seccion'

// Configuración › Leads era una página con pestañas (`?seccion=`). La ruta de la sección no dibuja nada: manda a una sub-ruta.
// - `?seccion=` de una que la persona abre: a su sub-ruta, con todos los demás parámetros en su orden (`?panel=`, `?origen=`, `?tipo=`,
//   `?tipo-de-seguimiento=`, `?campo=`…): ningún enlace profundo se pierde.
// - Sin `seccion`, o con algo que no es una sub-sección: a la primera que abre, con los demás parámetros (como hoy).
// - `seccion` de una apagada: a la primera que abre, sin parámetros (eran de otra parte).
// - Sin ninguna abierta: null, y la página dice «sin permiso».
// Ningún destino vuelve a redirigir: las sub-rutas no miran `seccion`. `abiertas` son las rutas de las sub-secciones que abre, en su orden.
export function destinoDeLeads(
  parametros: URLSearchParams,
  abiertas: readonly string[],
): string | null {
  const [primera] = abiertas
  if (primera === undefined) {
    return null
  }
  const seccion = parametros.get('seccion')
  const pedida = SUBSECCIONES_DE_LEADS.find((sub) => sub.clave === seccion)
  if (pedida !== undefined && !abiertas.includes(pedida.ruta)) {
    return primera
  }
  const resto = new URLSearchParams(parametros)
  resto.delete('seccion')
  const busqueda = resto.toString()
  const ruta = pedida?.ruta ?? primera
  return busqueda === '' ? ruta : `${ruta}?${busqueda}`
}

// Los `searchParams` de una página, como `URLSearchParams`: cada valor, también los que se repiten.
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
