'use client'

import { Button } from '@/shared/ui/button'
import {
  TarjetaEditable,
  ValoresDeLaTarjeta,
  type FilaDeValores,
} from '@/shared/ui/tarjetas-de-ajustes'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { PANEL_DE_TELEFONOS } from '../../../entities/paneles-de-la-configuracion'
import { useFamiliaDelPanel } from '../../configuracion/hooks/use-familia-del-panel'
import { useNumerosRepetidosPorUrl } from '../hooks/use-numeros-repetidos-por-url'
import { ModalDeNumerosRepetidosDiferido, ModalDeTelefonosExtraDiferido } from './diferidos'

function filasDeTelefonos(telefonos: AjustesDeLeads['telefonos']): FilaDeValores[] {
  return [
    { etiqueta: 'Máximo de teléfonos extra', valor: String(telefonos.maximo) },
    { etiqueta: 'Cuentan como el principal', valor: telefonos.comoPrincipal ? 'Sí' : 'No' },
  ]
}

// La tarjeta «Teléfonos extra» de Configuración › Leads: el máximo y si cuentan como el principal; «Editar» abre el formulario en un modal
// (`?panel=telefonos`). Con la regla encendida, «Números repetidos» abre aparte (`?panel=numeros-repetidos`) la lista de los que ya se repetían.
export function TarjetaDeTelefonosExtra({ telefonos }: { telefonos: AjustesDeLeads['telefonos'] }) {
  const familia = useFamiliaDelPanel('telefonos')
  const repetidos = useNumerosRepetidosPorUrl(telefonos.comoPrincipal)
  return (
    <>
      <TarjetaEditable
        titulo="Teléfonos extra"
        panel={PANEL_DE_TELEFONOS}
        motivo={null}
        abrir={familia.abrir}
      >
        <ValoresDeLaTarjeta filas={filasDeTelefonos(telefonos)} />
        {telefonos.comoPrincipal ? (
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-auto min-h-[44px] whitespace-normal md:min-h-8"
            onClick={repetidos.abrir}
          >
            Números repetidos
          </Button>
        ) : null}
      </TarjetaEditable>
      {familia.montar ? (
        <ModalDeTelefonosExtraDiferido
          abierto={familia.abierto}
          alCerrar={familia.cerrar}
          telefonos={telefonos}
        />
      ) : null}
      {repetidos.montar ? (
        <ModalDeNumerosRepetidosDiferido abierto={repetidos.abierto} alCerrar={repetidos.cerrar} />
      ) : null}
    </>
  )
}
