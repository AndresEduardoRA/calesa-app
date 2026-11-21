import type { KeyboardCoordinateGetter } from '@dnd-kit/core'
import type { EtapaGuardada } from '../../../entities/embudo'
import { etapaVecina } from '../../../entities/tablero-del-lead'

// Las flechas que pasan a la etapa de al lado: izquierda y arriba, a la anterior; derecha y abajo, a la siguiente (en el celular las etapas van
// una bajo otra, y el teclado externo también se usa ahí).
const PASO_DE_LA_FLECHA: Record<string, 1 | -1> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
}

// El teclado del arrastre: cada flecha lleva la tarjeta a la columna vecina (centrada, arriba de ella), no 25 px como el de fábrica. En el borde no
// se mueve. La etapa de la que se parte es la última a la que llevó una flecha (o la suya, al tomarla): `context.over` se actualiza con el dibujo, y
// dos flechas seguidas, más rápido que eso, partirían las dos de la misma columna. `reiniciar()` al tomar, soltar o cancelar.
export function crearTecladoDelArrastre() {
  let ultima: string | null = null
  return {
    reiniciar: () => {
      ultima = null
    },
    coordenadas:
      (etapas: readonly EtapaGuardada[]): KeyboardCoordinateGetter =>
      (evento, { context, currentCoordinates }) => {
        const paso = PASO_DE_LA_FLECHA[evento.code]
        const { active, collisionRect, droppableRects } = context
        if (paso === undefined || !active || !collisionRect) {
          return undefined
        }
        evento.preventDefault()
        const propia: unknown = active.data.current?.['etapaId']
        const desde = ultima ?? (typeof propia === 'string' ? propia : null)
        const destino = desde === null ? null : etapaVecina(etapas, desde, paso)
        const rect = destino ? droppableRects.get(destino.id) : undefined
        if (!destino || !rect) {
          return currentCoordinates
        }
        ultima = destino.id
        return { x: rect.left + (rect.width - collisionRect.width) / 2, y: rect.top + 8 }
      },
  }
}
