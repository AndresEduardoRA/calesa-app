'use client'

import { useState } from 'react'
import type { FormulaParaEditar } from '../../../../entities/formula/edicion'
import { useEditorDeLaFormula } from '../../hooks/use-editor-de-la-formula'
import { useLecturaDeLaDefinicion } from '../../hooks/use-lectura-de-la-definicion'
import { EditorDeLaFormula } from '../editor/editor-de-la-formula'
import { ListaDeFilasDiferida } from './diferidos'
import { EstadoDeLaLectura } from './estado-de-la-lectura'

export type PropsDeLaSesion = {
  origen: { id: string; nombre: string }
  // La versión que se edita: la del borrador o, sin él, la publicada.
  formulaId: string
  // «Sobre el borrador de <persona>.» o «Sobre la versión N publicada.»
  sobre: string
  // El Modo avanzado (`?panel=editar-formula`): el editor en texto.
  avanzado: boolean
  alVolver: () => void
  // Tras un conflicto al guardar: trae la pestaña de nuevo y vuelve a montar la sesión sobre lo que haya.
  recargando: boolean
  alRecargar: () => void
}

// Con la versión leída: la fórmula de trabajo, una sola para los dos modos.
function SesionLista({ leida, ...p }: PropsDeLaSesion & { leida: FormulaParaEditar }) {
  const editor = useEditorDeLaFormula({ origenId: p.origen.id, leida })
  if (!p.avanzado) return null
  return (
    <EditorDeLaFormula nombreDelOrigen={p.origen.nombre} sobre={p.sobre} alVolver={p.alVolver}>
      <ListaDeFilasDiferida
        editor={editor}
        nombreDelOrigen={p.origen.nombre}
        diseno={leida.diseno}
        recargando={p.recargando}
        alRecargar={p.alRecargar}
      />
    </EditorDeLaFormula>
  )
}

// La sesión de edición de la fórmula de un origen: lee la versión desde el navegador al montarse y tiene **la** fórmula de trabajo (`useEditorDeLaFormula`, una sola
// vez): la planilla y el Modo avanzado la comparten, así que lo aplicado en uno se ve en el otro sin reponer nada. Lo aplicado vive en la pestaña hasta «Guardar el
// borrador» (4.21-3b-1). Lee la versión con la que abrió y no otra (C8): guardar sobre la publicada crea el borrador y la pestaña cambia de versión, pero la sesión
// sigue sobre lo suyo; sólo «Recargar» la vuelve a montar.
export function SesionDeLaFormula(props: PropsDeLaSesion) {
  const [formulaId] = useState(props.formulaId)
  const { estado, reintentar } = useLecturaDeLaDefinicion(formulaId)
  if (estado.tipo === 'lista') return <SesionLista {...props} leida={estado.leida} />
  const cuerpo = (
    <EstadoDeLaLectura
      estado={estado}
      nombreDelOrigen={props.origen.nombre}
      alReintentar={reintentar}
    />
  )
  if (!props.avanzado) return null
  return (
    <EditorDeLaFormula
      nombreDelOrigen={props.origen.nombre}
      sobre={props.sobre}
      alVolver={props.alVolver}
    >
      {cuerpo}
    </EditorDeLaFormula>
  )
}
