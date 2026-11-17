'use client'

// Lleva el foco a algo que todavía no está o no se ve (el campo de un hueco que se monta al elegir su pestaña y aparece cuando llega su lectura): mira el DOM
// hasta que aparece visible, como mucho `TOPE_MS`, y se desconecta solo. Ya visible, espera dos cuadros para no pelear con el foco que `abrirHueco` deja en la
// pestaña. Si nunca aparece, el foco queda donde lo dejó `abrirHueco`. Devuelve con qué cortarlo.
const TOPE_MS = 5000

const visible = (el: HTMLElement) => el.isConnected && el.getClientRects().length > 0

function destinoDe(selector: string, campo: boolean): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el || !campo) return el
  return el.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea') ?? el
}

export function enfocarAlAparecer(selector: string, { campo = false } = {}): () => void {
  let terminado = false
  let tope: ReturnType<typeof setTimeout> | undefined
  const observador = new MutationObserver(() => {
    intentar()
  })
  const terminar = () => {
    terminado = true
    observador.disconnect()
    clearTimeout(tope)
  }
  function intentar(): boolean {
    if (terminado) return true
    const destino = destinoDe(selector, campo)
    if (!destino || !visible(destino)) return false
    terminar()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        destino.scrollIntoView({ block: 'nearest' })
        destino.focus()
      })
    })
    return true
  }
  if (!intentar()) {
    observador.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'open', 'class', 'style'],
    })
    tope = setTimeout(terminar, TOPE_MS)
  }
  return terminar
}
