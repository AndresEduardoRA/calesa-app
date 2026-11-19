'use client'

import type { FormulaDelOrigen as Formula } from '../../../entities/formula/versiones'
import type { PanelDeLaFormula } from '../hooks/use-panel-de-la-formula'
import { ListaDeVersiones } from './lista-de-versiones'
import { TarjetaDeLaPublicada } from './tarjeta-de-la-publicada'
import { TarjetaDelBorrador } from './tarjeta-del-borrador'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  origen: Origen
  formula: Formula
  panel: PanelDeLaFormula
}

// Lo que la pestaña «Fórmula» muestra cuando no edita (4.20-2a): la publicada del origen, su borrador y sus versiones (el origen se elige en la página).
// «Editar» (el borrador) y «Editar en un borrador» (la publicada, si no hay borrador) abren el editor (4.21-3a-1).
export function VistaDeLaFormula({ origen, formula, panel }: Props) {
  return (
    <>
      <TarjetaDeLaPublicada
        publicada={formula.publicada}
        origen={origen.nombre}
        {...(formula.borrador ? {} : { alEditar: panel.abrirEditor })}
      />
      {formula.borrador ? (
        <TarjetaDelBorrador
          borrador={formula.borrador}
          publicada={formula.publicada}
          alPublicar={panel.abrirPublicar}
          alDescartar={panel.abrirDescartar}
          alEditar={panel.abrirEditor}
        />
      ) : null}
      {/* Con otra publicada (se publicó o se revirtió) la lista vuelve a la primera página del servidor. */}
      <ListaDeVersiones
        key={`${origen.id}:${formula.publicada?.id ?? ''}`}
        origenId={origen.id}
        inicial={formula.versiones}
        conPublicada={formula.publicada !== null}
        alRevertir={panel.abrirRevertir}
      />
    </>
  )
}
