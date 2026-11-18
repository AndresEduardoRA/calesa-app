import { RUTAS } from '@/shared/lib/rutas'

// Sitio web era una página con pestañas (`?seccion=`). Esos enlaces siguen funcionando: van a su sub-ruta y conservan el resto de la
// URL (`?panel=`, `?faq=`, `?q=`…: lo de cada pantalla). null si no hay nada que mover (sin `seccion` o con una que no existe): `page.tsx`
// abre la primera sub-sección que la persona puede. Ningún destino vuelve a redirigir: ninguno lleva `seccion`.
const DESTINOS: Readonly<Record<string, string>> = {
  ajustes: RUTAS.ajustesDelSitio,
  legales: RUTAS.legalesDelSitio,
  guias: RUTAS.guiasDelSitio,
  faqs: RUTAS.faqsDelSitio,
  testimonios: RUTAS.testimoniosDelSitio,
}

export type ParametrosDeLaUrl = Readonly<Record<string, string | string[] | undefined>>

export function destinoDeLaUrlVieja(parametros: ParametrosDeLaUrl): string | null {
  const seccion = [parametros['seccion']].flat()[0]
  const ruta =
    seccion !== undefined && Object.hasOwn(DESTINOS, seccion) ? DESTINOS[seccion] : undefined
  if (ruta === undefined) {
    return null
  }
  const conservados = new URLSearchParams()
  for (const [nombre, valor] of Object.entries(parametros)) {
    if (nombre === 'seccion' || valor === undefined) {
      continue
    }
    for (const uno of [valor].flat()) {
      conservados.append(nombre, uno)
    }
  }
  const busqueda = conservados.toString()
  return busqueda === '' ? ruta : `${ruta}?${busqueda}`
}
