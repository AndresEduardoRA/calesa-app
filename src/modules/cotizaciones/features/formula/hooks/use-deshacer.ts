'use client'

import { useEffect, useRef } from 'react'
import { avisar, avisarConDeshacer } from '@/shared/ui/toasts'
import type { Formula } from '../../../entities/formula'
import type { EditorDeLaFormula } from './use-editor-de-la-formula'

export const MENSAJE_SIN_DESHACER = 'Ya cambiaste la fórmula: no se puede deshacer.'

// Deshacer de un nivel (D17 del cambio de la planilla: eliminar una fila, quitar una banda): aplica el cambio y ofrece «Deshacer» en el aviso, que vuelve a la fórmula
// de antes sólo si la de trabajo sigue siendo la que dejó el cambio (si no, lo dice: nada se pisa).
export function useDeshacer(editor: EditorDeLaFormula) {
  const ultima = useRef(editor.trabajo)
  useEffect(() => {
    ultima.current = editor.trabajo
  }, [editor.trabajo])
  return (formula: Formula, mensaje: string) => {
    const antes = editor.trabajo
    if (!editor.cambiar(formula)) return
    ultima.current = formula
    avisarConDeshacer(mensaje, () => {
      if (ultima.current !== formula) avisar(MENSAJE_SIN_DESHACER)
      else editor.cambiar(antes)
    })
  }
}
