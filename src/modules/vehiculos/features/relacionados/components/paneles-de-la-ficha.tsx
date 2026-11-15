'use client'

import type { AvisosDelMenu } from '../../../entities/avisos-de-vehiculo'
import { PanelDesvincularDelVehiculo } from '../../vinculo/components/panel-desvincular-del-vehiculo'
import type { usePanelesDeLaFicha } from '../hooks/use-paneles-de-la-ficha'
import type { HuecosDeRelacionados } from './huecos'

type Props = {
  paneles: ReturnType<typeof usePanelesDeLaFicha>
  // El vehículo: lo que pide desvincularlo.
  vehiculo: { id: string; titulo: string; numero: number; actualizadoEn: string }
  origenId: string
  editable: boolean
  huecos: HuecosDeRelacionados | undefined
  numeroGlobal: boolean
  ofrecerPapelera: boolean
  avisos: AvisosDelMenu | undefined
}

const TITULOS = { vincular: 'Vincular a un lead', marcar: 'Marcar un interesado' } as const

// Lo que el bloque «Relacionados» abre por la URL en la ficha del vehículo: la confirmación de «Desvincular» (también la abre el aviso «Quitar el vínculo» con `?luego=papelera`) y los dos
// selectores de leads, que `src/app` une desde `leads` (`huecos.ElegirLead`).
export function PanelesDeLaFicha({
  paneles,
  vehiculo,
  origenId,
  editable,
  huecos,
  numeroGlobal,
  ofrecerPapelera,
  avisos,
}: Props) {
  const Selector = huecos?.ElegirLead
  return (
    <>
      {editable ? (
        <PanelDesvincularDelVehiculo
          vehiculo={vehiculo}
          origenId={origenId}
          ofrecerPapelera={ofrecerPapelera}
          {...(avisos ? { avisos } : {})}
        />
      ) : null}
      {Selector
        ? (['vincular', 'marcar'] as const).map((clave) => {
            const panel = paneles[clave]
            return panel.montado ? (
              <Selector
                key={clave}
                abierto={panel.abierto}
                alCerrar={panel.cerrar}
                alElegir={(leadId) => void panel.elegir(leadId)}
                titulo={TITULOS[clave]}
                error={panel.error}
                numeroGlobal={numeroGlobal}
              />
            ) : null
          })
        : null}
    </>
  )
}
