'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeLasCotizaciones } from './esqueleto-de-las-cotizaciones'

// Las cotizaciones más recientes del bloque «Cotizaciones» de la ficha del lead: su código llega al acercarse al bloque, no con la ficha. Va en su propio
// `diferidos.tsx`: el del historial del panel lo pagaría `/cotizaciones/nuevo` (4-73). El aviso de «Sin conexión» va en su lugar (`'aqui'`).
export const CotizacionesRecientesDelLeadDiferido = diferido(
  () =>
    import('../cotizaciones-recientes-del-lead').then(
      (modulo) => modulo.CotizacionesRecientesDelLead,
    ),
  { aviso: 'aqui', esqueleto: <EsqueletoDeLasCotizaciones /> },
)
