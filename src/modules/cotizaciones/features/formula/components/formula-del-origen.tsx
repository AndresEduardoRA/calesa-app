'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition, type ComponentType } from 'react'
import type { FormulaDelOrigen as Formula } from '../../../entities/formula/versiones'
import type {
  LecturaDeLaTarjetaEnVivo,
  PropsDeLaTarjetaEnVivo,
} from '../../../entities/tarjeta-en-vivo'
import { usePanelDeLaFormula } from '../hooks/use-panel-de-la-formula'
import { AccionesDeLaFormula } from './acciones-de-la-formula'
import { SesionDeLaFormulaDiferida } from './diferidos'
import { VistaDeLaFormula } from './vista-de-la-formula'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  origen: Origen
  formula: Formula
  tarjeta: LecturaDeLaTarjetaEnVivo
  TarjetaEnVivo: ComponentType<PropsDeLaTarjetaEnVivo>
  puedeCambiarTiposDeCambio: boolean
}

// Sobre qué versión se edita: el borrador o, sin él, la publicada.
const sobreQue = (formula: Formula) =>
  formula.borrador
    ? `Sobre el borrador de ${formula.borrador.autor}.`
    : `Sobre la versión ${String(formula.publicada?.version ?? '')} publicada.`

// La pestaña «Fórmula» de un origen en Configuración › Cotización: arriba su publicada, su borrador y sus versiones (`VistaDeLaFormula`; desde el borrador se publica
// y desde una archivada se revierte, `?panel=publicar-formula`, `?panel=revertir-formula&version=<id>`; el borrador se descarta, `?panel=descartar-borrador`) y abajo
// la planilla de la fórmula, sobre el borrador o, sin él, la publicada. Con `?panel=editar-formula`, el Modo avanzado (el editor en texto) ocupa el lugar de todo:
// la sesión que tiene la fórmula de trabajo es la misma y no se vuelve a montar al cambiar de modo. Su `key` no lleva la versión (C8): guardar sobre la publicada
// crea el borrador y la sesión sigue montada; sólo «Recargar» tras un conflicto la vuelve a montar, en la misma transición que trae la pestaña. «Publicar…» espera
// mientras haya cambios aplicados sin guardar: se publica lo guardado.
export function FormulaDelOrigen({
  origen,
  formula,
  tarjeta,
  TarjetaEnVivo,
  puedeCambiarTiposDeCambio,
}: Props) {
  const panel = usePanelDeLaFormula()
  const router = useRouter()
  const [vuelta, setVuelta] = useState(0)
  const [pendientes, setPendientes] = useState(false)
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
      {panel.editando && sobre ? null : (
        <VistaDeLaFormula
          origen={origen}
          formula={formula}
          panel={panel}
          publicarEspera={pendientes}
        />
      )}
      {sobre ? (
        <SesionDeLaFormulaDiferida
          key={`${origen.id}:${String(vuelta)}`}
          origen={origen}
          formulaId={sobre.id}
          sobre={sobreQue(formula)}
          avanzado={panel.editando}
          alAbrirAvanzado={panel.abrirEditor}
          alVolver={panel.cerrar}
          recargando={recargando}
          alRecargar={recargar}
          alCambiarPendientes={setPendientes}
          tarjeta={tarjeta}
          TarjetaEnVivo={TarjetaEnVivo}
          puedeCambiarTiposDeCambio={puedeCambiarTiposDeCambio}
        />
      ) : null}
      <AccionesDeLaFormula panel={panel} origen={origen} formula={formula} />
    </div>
  )
}
