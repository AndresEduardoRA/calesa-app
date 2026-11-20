'use client'

import type { ReactNode } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { AccionDeMenu } from '@/shared/ui/lista'
import type { FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'
import { menuDeLaFormulaDelOrigen } from '../../../entities/formulas-del-origen/menu'
import {
  CLAVE_DE_LA_FORMULA,
  PANEL_ACTIVAR_FORMULA,
  PANEL_ARCHIVAR_FORMULA,
  PANEL_ELIMINAR_FORMULA,
  PANEL_RENOMBRAR_FORMULA,
} from '../../../entities/formulas-del-origen/rutas'
import {
  ConfirmarArchivarDiferido,
  ConfirmarEliminarDiferido,
  ModalDeActivarDiferido,
  ModalDeRenombrarDiferido,
} from '../components/diferidos'

export const MOTIVO_NO_ESTA = 'Esa fórmula ya no está en la lista: recarga para ver cómo quedó.'

// Un panel de una fórmula del origen por la URL (`?panel=<panel>&formula=<id>`): se revisa al llegar (una fórmula que no está en lo leído no se abre: se avisa y
// se limpia la URL) y cada apertura aceptada empieza de cero (`apertura`, la `key` de lo de adentro). Se monta recién al abrirse por primera vez.
function usePanelDeLaFormula(panel: string, formulas: readonly FormulaDeLaLista[]) {
  const url = usePanelPorUrl(panel, [CLAVE_DE_LA_FORMULA])
  const id = url.valor(CLAVE_DE_LA_FORMULA)
  const formula = formulas.find((f) => f.id === id) ?? null
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${panel}:${String(apertura)}` : null,
    formula === null ? MOTIVO_NO_ESTA : null,
    url.cerrar,
  )
  const abierto = url.abierto && !rechazada && formula !== null
  // Mientras se va (cerrado), conserva la fórmula que mostraba.
  const mostrada = useUltimo(abierto ? formula : null)
  return {
    abierto,
    formula: mostrada,
    apertura,
    montado: useAbiertoAlgunaVez(abierto),
    abrir: (formulaId: string) => {
      url.abrir({ [CLAVE_DE_LA_FORMULA]: formulaId })
    },
    cerrar: url.cerrar,
  }
}

type Args = {
  origen: { id: string; nombre: string }
  // Las fórmulas que la pantalla dibuja (la lista y las archivadas leídas, o la del editor): un panel sólo abre una de éstas.
  formulas: readonly FormulaDeLaLista[]
  activa: { id: string; nombre: string } | null
  // «Copiar»: en la lista abre «Nueva fórmula» con la copia; en el editor lleva a la lista con ese panel.
  alCopiar: (formula: FormulaDeLaLista) => void
  // «Activar…»: en la lista abre su panel; el editor lo cambia por ir a la lista con ese panel (ahí se ve qué deja de usarse).
  alActivar?: (formula: FormulaDeLaLista) => void
  // Desde el editor, archivar o eliminar vuelven a la lista.
  volverALaLista: boolean
}

// Los cuatro paneles de una fórmula (Renombrar, Activar, Archivar y Eliminar), montados una vez por pantalla y abiertos por la URL, y el «⋯» de cada fórmula que
// los abre (`menuDeLaFormulaDelOrigen()`): el mismo en la fila de la lista y en la cabeza del editor.
export function usePanelesDeLaFormula({
  origen,
  formulas,
  activa,
  alCopiar,
  alActivar,
  volverALaLista,
}: Args): {
  menuDe: (formula: FormulaDeLaLista) => AccionDeMenu[]
  paneles: ReactNode
} {
  const renombrar = usePanelDeLaFormula(PANEL_RENOMBRAR_FORMULA, formulas)
  const activar = usePanelDeLaFormula(PANEL_ACTIVAR_FORMULA, formulas)
  const archivar = usePanelDeLaFormula(PANEL_ARCHIVAR_FORMULA, formulas)
  const eliminar = usePanelDeLaFormula(PANEL_ELIMINAR_FORMULA, formulas)
  const menuDe = (formula: FormulaDeLaLista) =>
    menuDeLaFormulaDelOrigen(formula, {
      alRenombrar: () => renombrar.abrir(formula.id),
      alCopiar: () => alCopiar(formula),
      alActivar: () => (alActivar ? alActivar(formula) : activar.abrir(formula.id)),
      alArchivar: () => archivar.abrir(formula.id),
      alEliminar: () => eliminar.abrir(formula.id),
    })
  const paneles = (
    <>
      {renombrar.montado && renombrar.formula ? (
        <ModalDeRenombrarDiferido
          key={renombrar.apertura}
          abierto={renombrar.abierto}
          alCerrar={renombrar.cerrar}
          origenId={origen.id}
          formula={renombrar.formula}
        />
      ) : null}
      {activar.montado && activar.formula ? (
        <ModalDeActivarDiferido
          key={activar.apertura}
          abierto={activar.abierto}
          alCerrar={activar.cerrar}
          origen={origen}
          formula={activar.formula}
          activa={activa}
        />
      ) : null}
      {archivar.montado && archivar.formula ? (
        <ConfirmarArchivarDiferido
          key={archivar.apertura}
          abierto={archivar.abierto}
          alCerrar={archivar.cerrar}
          origenId={origen.id}
          formula={archivar.formula}
          volverALaLista={volverALaLista}
        />
      ) : null}
      {eliminar.montado && eliminar.formula ? (
        <ConfirmarEliminarDiferido
          key={eliminar.apertura}
          abierto={eliminar.abierto}
          alCerrar={eliminar.cerrar}
          origenId={origen.id}
          formula={eliminar.formula}
          volverALaLista={volverALaLista}
        />
      ) : null}
    </>
  )
  return { menuDe, paneles }
}
