'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { FormulaDelOrigen as Formula } from '../../../entities/formula/versiones'
import { usePanelDeLaFormula } from '../hooks/use-panel-de-la-formula'
import { AccionesDeLaFormula } from './acciones-de-la-formula'
import { EditorDeLaFormulaDiferido } from './diferidos'
import { VistaDeLaFormula } from './vista-de-la-formula'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  origen: Origen
  formula: Formula
}

// Sobre qué versión se edita: el borrador o, sin él, la publicada.
const sobreQue = (formula: Formula) =>
  formula.borrador
    ? `Sobre el borrador de ${formula.borrador.autor}.`
    : `Sobre la versión ${String(formula.publicada?.version ?? '')} publicada.`

// La pestaña «Fórmula» de un origen en Configuración › Cotización (4.20-2a): su publicada, su borrador y sus versiones (`VistaDeLaFormula`). Desde el borrador se
// publica y desde una archivada se revierte (4.20-2b, `?panel=publicar-formula`, `?panel=revertir-formula&version=<id>`); el borrador se descarta (4.20-2c,
// `?panel=descartar-borrador`). Con `?panel=editar-formula` (4.21-3a-1), el editor en texto ocupa el lugar del selector, las tarjetas y la lista: edita el
// borrador o, sin él, la publicada. Su `key` no lleva la versión (4.21-3b-1, C8): guardar sobre la publicada crea el borrador y el editor sigue montado; sólo
// «Recargar» tras un conflicto lo vuelve a montar, en la misma transición que trae la pestaña, sobre lo que haya entonces.
export function FormulaDelOrigen({ origen, formula }: Props) {
  const panel = usePanelDeLaFormula()
  const router = useRouter()
  const [vuelta, setVuelta] = useState(0)
  const [recargando, recargarPagina] = useTransition()
  const sobre = formula.borrador ?? formula.publicada
  const recargar = () => {
    recargarPagina(() => {
      router.refresh()
      setVuelta((v) => v + 1)
    })
  }
  return (
    <div className="grid min-w-0 gap-4">
      {panel.editando && sobre ? (
        <EditorDeLaFormulaDiferido
          key={`${origen.id}:${String(vuelta)}`}
          origen={origen}
          formulaId={sobre.id}
          sobre={sobreQue(formula)}
          alVolver={panel.cerrar}
          recargando={recargando}
          alRecargar={recargar}
        />
      ) : (
        <VistaDeLaFormula origen={origen} formula={formula} panel={panel} />
      )}
      <AccionesDeLaFormula panel={panel} origen={origen} formula={formula} />
    </div>
  )
}
