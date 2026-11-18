// Qué clic en un enlace saca a la persona de la pantalla que está editando (`<BarraDeCambiosSinGuardar>`): sólo ése pregunta
// antes de salir. No pregunta el que abre otra pestaña o ventana (`target`, una tecla modificadora, otro botón del ratón), el que
// descarga, el que va afuera de la app (la pantalla sigue abierta en la suya) ni el que se queda en la misma página (un `#ancla`, la
// misma ruta y búsqueda).
export type ClicEnUnEnlace = {
  href: string
  target: string | null
  download: boolean
  // `MouseEvent.button`: 0 es el principal.
  boton: number
  // Ctrl, Meta, Shift o Alt apretada.
  conModificador: boolean
}

// La ruta interna (con su búsqueda y su ancla) si el clic sale de esta pantalla; null si no.
export function destinoQuePregunta(clic: ClicEnUnEnlace, actual: URL): string | null {
  if (clic.boton !== 0 || clic.conModificador || clic.download) {
    return null
  }
  if (clic.target !== null && clic.target !== '' && clic.target !== '_self') {
    return null
  }
  let destino: URL
  try {
    destino = new URL(clic.href, actual)
  } catch {
    return null
  }
  if (destino.origin !== actual.origin) {
    return null
  }
  if (destino.pathname === actual.pathname && destino.search === actual.search) {
    return null
  }
  return `${destino.pathname}${destino.search}${destino.hash}`
}
