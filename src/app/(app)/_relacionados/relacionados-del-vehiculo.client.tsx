'use client'

import { PanelParaVincularDiferido } from '@/modules/leads/pantallas/relacionados'
import {
  RelacionadosDelVehiculoCliente,
  type HuecosDeRelacionados,
  type PropsDeElegirLead,
} from '@/modules/vehiculos/pantallas/relacionados'
import type { ComponentProps } from 'react'

// La clave de la URL donde el alta de un lead dejaría el creado: acá no se crea (el selector sólo elige entre leads que ya existen), pero el panel la pide.
const CLAVE_DEL_ALTA = 'elegido'

// El selector de leads de «Vincular a un lead» y «Marcar un interesado»: el panel de `leads` (el mismo del turno de la web y de la hoja de cotizar) sin «+». `vehiculos` no conoce `leads`: lo une `src/app`.
function ElegirLead({
  abierto,
  alCerrar,
  alElegir,
  titulo,
  error,
  numeroGlobal,
}: PropsDeElegirLead) {
  return (
    <PanelParaVincularDiferido
      abierto={abierto}
      alCerrar={alCerrar}
      alElegir={alElegir}
      puedeCrear={false}
      numeroGlobal={numeroGlobal}
      claveDeLaUrl={CLAVE_DEL_ALTA}
      error={error}
      titulo={titulo}
    />
  )
}

const HUECOS: HuecosDeRelacionados = { ElegirLead }

type Props = Omit<ComponentProps<typeof RelacionadosDelVehiculoCliente>, 'huecos'>

// El bloque «Relacionados» de un vehículo con su selector de leads: un Client Component porque un componente no cruza de servidor a cliente como prop.
export function RelacionadosDelVehiculoConHuecos(props: Props) {
  return <RelacionadosDelVehiculoCliente {...props} huecos={HUECOS} />
}
