'use client'

import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import type { LeyendaDeTiposCambio } from '../../../entities/compartir-tipos-cambio'
import type { Moneda } from '../../../entities/tipos-cambio'
import { ModalDeMonedaBaseDiferido } from '../../empresa/components/diferidos'
import type { NavegacionDeMonedas } from '../hooks/use-navegacion-de-monedas'
import type { usePanelesDeMonedas } from '../hooks/use-paneles-de-monedas'
import { ModalDeLeyendaDiferido, ModalDeMonedasDiferido } from './diferidos'

type Props = {
  modales: ReturnType<typeof usePanelesDeMonedas>
  ajustes: AjustesEmpresa
  monedas: readonly Moneda[]
  conDatosCargados: boolean
  leyenda: LeyendaDeTiposCambio
  ir: NavegacionDeMonedas['ir']
}

// Los tres modales de Monedas: la base, la lista de monedas y la leyenda. Cada uno se monta al abrirse la primera vez (su código viaja entonces).
export function ModalesDeMonedas({
  modales,
  ajustes,
  monedas,
  conDatosCargados,
  leyenda,
  ir,
}: Props) {
  const monedaBase = ajustes.monedaBase
  return (
    <>
      {modales.base.montar ? (
        <ModalDeMonedaBaseDiferido
          abierto={modales.base.abierto}
          alCerrar={modales.cerrar}
          ajustes={ajustes}
          conDatosCargados={conDatosCargados}
          monedas={monedas.filter((una) => una.activa || una.codigo === monedaBase)}
        />
      ) : null}
      {modales.monedas.montar ? (
        <ModalDeMonedasDiferido
          abierto={modales.monedas.abierto}
          alCerrar={modales.cerrar}
          monedas={monedas}
          monedaBase={monedaBase}
          alAbrir={(codigo) => {
            ir({ moneda: codigo })
          }}
          alCrear={() => {
            ir({ panel: 'nueva-moneda' })
          }}
        />
      ) : null}
      {modales.leyenda.montar ? (
        <ModalDeLeyendaDiferido
          abierto={modales.leyenda.abierto}
          alCerrar={modales.cerrar}
          leyenda={leyenda}
        />
      ) : null}
    </>
  )
}
