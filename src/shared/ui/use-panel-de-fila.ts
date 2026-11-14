'use client'

import { usePanelPorUrl } from './use-panel-por-url'
import { useApertura } from './use-apertura'
import { useRevisionAlAbrir } from './use-revision-al-abrir'

// Un diálogo del «⋯» de una fila de una lista, en la URL (`?panel=<panel>&<fila>=<id>`, más las `otras` claves que nombran lo que muestra): se revisa una vez, al llegar (`motivoDe`:
// una fila que no está en la página o una acción que ya no se ofrece no abre, avisa y limpia la URL) y devuelve si está abierto, qué fila nombra y el valor de cada clave.
export function usePanelDeFila(
  panel: string,
  claveDeLaFila: string,
  otras: readonly string[],
  motivoDe: (fila: string | null, valorDe: (clave: string) => string | null) => string | null,
) {
  const url = usePanelPorUrl(panel, [...otras, claveDeLaFila])
  const apertura = useApertura(url.abierto)
  const fila = url.valor(claveDeLaFila)
  const motivo = motivoDe(fila, url.valor)
  const nombradas = otras.map((clave) => url.valor(clave) ?? '').join(':')
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${fila ?? ''}:${nombradas}` : null,
    motivo,
    url.cerrar,
  )
  return {
    abierto: url.abierto && !rechazada && motivo === null,
    fila,
    valor: url.valor,
    cerrar: url.cerrar,
  }
}
