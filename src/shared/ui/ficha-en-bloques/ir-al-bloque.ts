import { ATRIBUTO_DE_BLOQUE, EVENTO_DE_SALTO } from './estilos'

// El título de un bloque: el `h2` que dibuja el marco o el primero que trae el bloque. Se le da `tabindex=-1` si no lo tiene, para
// poder llevarle el foco (no entra al orden del Tab).
export function tituloDe(bloque: HTMLElement): HTMLElement | null {
  const titulo = bloque.querySelector<HTMLElement>('h2')
  if (titulo && !titulo.hasAttribute('tabindex')) {
    titulo.tabIndex = -1
  }
  return titulo
}

const sinAnimacion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Lleva la página a un bloque de una ficha en bloques (`id` = su ancla) y, salvo `enfocar: false` (hay un modal abierto por la URL:
// no se le roba el foco), le da el foco a su título sin volver a desplazar. Falso si el bloque no está en la página (sin permiso, o
// todavía no llegó): quien llama deja que el enlace haga lo suyo.
export function irAlBloque(
  ancla: string,
  { enfocar = true, suave = true }: { enfocar?: boolean; suave?: boolean } = {},
): boolean {
  const bloque = document.getElementById(ancla)
  if (!bloque?.hasAttribute(ATRIBUTO_DE_BLOQUE)) {
    return false
  }
  bloque.scrollIntoView({ block: 'start', behavior: suave && !sinAnimacion() ? 'smooth' : 'auto' })
  if (enfocar) {
    tituloDe(bloque)?.focus({ preventScroll: true })
  }
  bloque.dispatchEvent(new CustomEvent(EVENTO_DE_SALTO, { bubbles: true, detail: ancla }))
  return true
}
