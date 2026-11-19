'use client'

import { useALaVista } from '@/shared/ui/use-a-la-vista'
import { CotizacionesRecientesDelLeadDiferido } from './diferidos'
import { EsqueletoDeLasCotizaciones } from './esqueleto-de-las-cotizaciones'

// El bloque «Cotizaciones» de la ficha del lead bajo su título: hasta acercarse a la vista (200 px antes), las tres filas grises; recién ahí llegan el código
// y la lectura de las más recientes. No va diferido: es chico y es lo que sabe cuándo pedir. Quien lo monta pone `key={leadId}`.
export function CotizacionesDelLeadAlAcercarse({ leadId }: { leadId: string }) {
  const [observar, visto] = useALaVista<HTMLDivElement>()
  return (
    <div ref={observar} className="min-w-0">
      {visto ? (
        <CotizacionesRecientesDelLeadDiferido leadId={leadId} />
      ) : (
        <EsqueletoDeLasCotizaciones />
      )}
    </div>
  )
}
