import type { AriaLabelConfig } from '@xyflow/react'

// Los textos de React Flow para el lector, en español (sin teclado ni minimapa ni controles suyos, igual quedan en el DOM).
export const TEXTOS_DE_REACT_FLOW: AriaLabelConfig = {
  'node.a11yDescription.default': 'Una fase del flujo.',
  'node.a11yDescription.keyboardDisabled': 'Una fase del flujo.',
  'node.a11yDescription.ariaLiveMessage': ({ direction }) => `Fase movida hacia ${direction}.`,
  'edge.a11yDescription.default': 'Una salida entre dos fases.',
  'controls.ariaLabel': 'Controles del diagrama',
  'controls.zoomIn.ariaLabel': 'Acercar',
  'controls.zoomOut.ariaLabel': 'Alejar',
  'controls.fitView.ariaLabel': 'Ver todo el flujo',
  'controls.interactive.ariaLabel': 'Bloquear el diagrama',
  'minimap.ariaLabel': 'Minimapa',
  'handle.ariaLabel': 'Punto de conexión',
}
