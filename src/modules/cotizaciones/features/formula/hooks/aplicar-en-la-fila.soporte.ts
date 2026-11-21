// Lo que hace la planilla al aplicar un texto en la C de una fila que ya está (`aplicarLoEscrito()` → `editor.cambiar()`), para las pruebas del editor de la
// fórmula sin dibujar la planilla. Devuelve lo compilado y si la fórmula de trabajo cambió (mientras guarda, no).
import { act } from '@testing-library/react'
import { compilarFila } from '../../../entities/formula/compilar-fila'
import type { EditorDeLaFormula } from './use-editor-de-la-formula'

export function aplicarEnLaFila(
  editor: { readonly current: EditorDeLaFormula },
  id: string,
  texto: string,
  confirmaPisar = false,
) {
  const r = compilarFila(editor.current.trabajo, {
    destino: { existente: id },
    texto,
    tablas: editor.current.tablas,
    confirmaPisar,
  })
  let entro = false
  if (r.ok)
    act(() => {
      entro = editor.current.cambiar(r.formula, { id, soltados: r.soltados })
    })
  return { r, entro }
}
