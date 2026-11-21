'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { Planilla } from '../../../hooks/use-planilla'
import type { TipoDeCambioDeLaEmpresa } from '../tipos'
import {
  PanelComoSeEscribeDiferido,
  PanelDeLaBandaDiferido,
  PanelDelTipoDeCeldaDiferido,
  PanelDelTotalDiferido,
} from './diferidos'

type Props = {
  planilla: Planilla
  origen: { id: string; nombre: string }
  tiposDeCambio: readonly TipoDeCambioDeLaEmpresa[]
}

// Los paneles de la planilla, montados una vez cada uno desde que se abren (el código llega con la primera apertura y el panel se desliza al cerrar).
export function PanelesDeLaPlanilla({ planilla, origen, tiposDeCambio }: Props) {
  const { paneles } = planilla
  const banda = useAbiertoAlgunaVez(paneles.banda.abierto || paneles.nuevaBanda.abierto)
  const total = useAbiertoAlgunaVez(paneles.total.abierto)
  const tipo = useAbiertoAlgunaVez(paneles.tipo.abierto)
  const ayuda = useAbiertoAlgunaVez(paneles.ayuda.abierto)
  return (
    <>
      {banda ? <PanelDeLaBandaDiferido planilla={planilla} /> : null}
      {total ? <PanelDelTotalDiferido planilla={planilla} /> : null}
      {tipo ? (
        <PanelDelTipoDeCeldaDiferido
          planilla={planilla}
          origen={origen}
          tiposDeCambio={tiposDeCambio}
        />
      ) : null}
      {ayuda ? <PanelComoSeEscribeDiferido planilla={planilla} /> : null}
    </>
  )
}
