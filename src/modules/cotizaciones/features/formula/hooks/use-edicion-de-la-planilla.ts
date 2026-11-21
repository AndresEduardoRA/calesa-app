'use client'

import { useMemo } from 'react'
import type { CambioDeLaUnidad } from '../../../entities/formula/escrito-en-la-celda'
import type { HojaDeLaPlanilla } from '../../../entities/formula/hoja-de-la-planilla'
import {
  bordesDeReferencias,
  leyendaDeReferencias,
  referenciasTipeadas,
} from '../../../entities/formula/referencias-tipeadas'
import { textoDeLaCelda } from '../../../entities/formula/texto-de-la-celda'
import type { UnidadDeEjemplo } from '../../../entities/formula/unidad-de-ejemplo'
import type { CalculoDeLaPlanilla } from './use-calculo-de-la-planilla'
import type { CeldaActiva } from './use-cuadricula'
import { useEdicionConReferencias } from './use-edicion-con-referencias'
import type { EditorDeLaFormula } from './use-editor-de-la-formula'
import type { FilaParaDibujar } from './use-editor-de-la-formula.soporte'
import { useSugerencias } from './use-sugerencias'

type Args = {
  editor: EditorDeLaFormula
  hoja: HojaDeLaPlanilla
  calculo: CalculoDeLaPlanilla
  unidad: UnidadDeEjemplo
  alCambiarUnidad: (cambio: CambioDeLaUnidad) => void
}

const textoConIdsDe = (fila: FilaParaDibujar | undefined) =>
  fila !== undefined && 'texto' in fila.texto ? fila.texto.texto : null

// La edición de la planilla: con qué texto abre cada celda (`textoDeLaCelda()`), la edición con referencias, el autocompletar y lo que pinta lo tipeado (los colores,
// la leyenda y el borde de cada celda nombrada).
export function useEdicionDeLaPlanilla({ editor, hoja, calculo, unidad, alCambiarUnidad }: Args) {
  const { locale, dichas } = calculo
  const filas = useMemo(() => new Map(editor.filas.map((f) => [f.id, f])), [editor.filas])
  const textoDe = (celda: CeldaActiva) =>
    textoDeLaCelda(hoja.numeroDe.get(celda.id) ?? 0, celda.col, {
      formula: editor.trabajo,
      hoja,
      unidad,
      locale,
      textoConIds: textoConIdsDe(filas.get(celda.id)),
      deDondeSale: dichas.get(celda.id) ?? '',
    })
  const edicion = useEdicionConReferencias({ editor, hoja, locale, textoDe, alCambiarUnidad })
  const grupos = useMemo(
    () => (editor.trabajo.definicion.grupos ?? []).map((g) => ({ id: g.id, etiqueta: g.etiqueta })),
    [editor.trabajo],
  )
  const sugerencias = useSugerencias({ edicion, hoja, tablas: editor.tablas, grupos })
  const texto = edicion.edicion?.texto ?? null
  const refs = useMemo(
    () => (texto === null ? [] : referenciasTipeadas(texto, hoja)),
    [texto, hoja],
  )
  const leyenda = useMemo(() => leyendaDeReferencias(refs, hoja), [refs, hoja])
  const bordes = useMemo(() => bordesDeReferencias(refs), [refs])
  return { textoDe, edicion, sugerencias, refs, leyenda, bordes }
}

export type EdicionDeLaPlanilla = ReturnType<typeof useEdicionDeLaPlanilla>
