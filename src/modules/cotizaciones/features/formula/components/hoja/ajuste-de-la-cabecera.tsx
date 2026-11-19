'use client'

import { use } from 'react'
import type { PropsDelAjusteDeLaCabecera } from '../../../hoja/components/huecos'
import { PanelDelAjusteDeLaCabeceraDiferido } from './diferidos'
import { ContextoDelOrigenDelAjuste } from './origen-del-ajuste'

// El `AjusteDeLaCabecera` que el área da a la hoja: el panel del ⚙ de la cabecera, con el origen de la hoja, por `diferido()`.
export function AjusteDeLaCabecera(props: PropsDelAjusteDeLaCabecera) {
  const origenId = use(ContextoDelOrigenDelAjuste)
  return origenId === null ? null : (
    <PanelDelAjusteDeLaCabeceraDiferido {...props} origenId={origenId} />
  )
}
