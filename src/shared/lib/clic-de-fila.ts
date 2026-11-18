// Qué clics dentro de una fila o una tarjeta de lista abren su resumen o su ficha y cuáles no (`.claude/rules/ui.md`, patrón de lista).
// Abre un clic en cualquier parte de la fila; no abre el que es de algo que la fila tiene adentro: una casilla, el «⋯»,
// un enlace o un botón propio. El nombre se marca con `data-abre-resumen`: el botón de una lista con resumen sube su clic a la fila y
// abre una sola vez (el teclado también: Enter sobre un botón es un clic); el enlace de una lista con ficha (`<EnlaceDeLaFila>`,
// `data-enlace-de-la-fila`) navega solo y la fila no hace nada (`esClicDelEnlace`).
const DE_LA_FILA =
  'a[href], button, input, select, textarea, label, summary, [role="menuitem"], [role="checkbox"], [role="button"], [data-no-abre]'

type ClicEnUnaFila = { target: EventTarget | null; currentTarget: Element }

export function esClicPropio({ target, currentTarget }: ClicEnUnaFila): boolean {
  if (!(target instanceof Element)) {
    return false
  }
  // React sube los eventos de un portal por el árbol de componentes: el menú del «⋯» y los selectores que se abren desde una
  // fila viven fuera de ella en el DOM, y nada de lo que pasa ahí abre la fila.
  if (!currentTarget.contains(target)) {
    return true
  }
  const propio = target.closest(DE_LA_FILA)
  return (
    propio !== null && currentTarget.contains(propio) && !propio.hasAttribute('data-abre-resumen')
  )
}

// El enlace del nombre de una fila que lleva a su ficha (`<EnlaceDeLaFila>`): navega él (con Ctrl, el botón del medio, «Copiar enlace»…)
// y la fila no repite la navegación.
export const ATRIBUTO_DEL_ENLACE_DE_LA_FILA = 'data-enlace-de-la-fila'

export function esClicDelEnlace({ target, currentTarget }: ClicEnUnaFila): boolean {
  if (!(target instanceof Element)) {
    return false
  }
  const enlace = target.closest(`[${ATRIBUTO_DEL_ENLACE_DE_LA_FILA}]`)
  return enlace !== null && currentTarget.contains(enlace)
}

type BotonesDelClic = { button: number; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }

// Un clic en una fila con ficha que la abre en otra pestaña, como lo haría un enlace: con Ctrl, Cmd o Shift, o con el botón del medio.
export function abreEnOtraPestana({ button, ctrlKey, metaKey, shiftKey }: BotonesDelClic): boolean {
  return button === 1 || (button === 0 && (ctrlKey || metaKey || shiftKey))
}

// Hay texto elegido dentro de la fila (copiar el VIN arrastrando): el clic que termina esa selección no navega.
export function hayTextoElegidoEn(fila: Element, seleccion: Selection | null): boolean {
  if (seleccion === null || seleccion.isCollapsed || seleccion.toString().trim() === '') {
    return false
  }
  return seleccion.anchorNode !== null && fila.contains(seleccion.anchorNode)
}
