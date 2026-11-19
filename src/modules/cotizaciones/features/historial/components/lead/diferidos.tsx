'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeLasCotizaciones } from './esqueleto-de-las-cotizaciones'

// La sección «Cotizaciones» de la ficha del lead: su código llega al abrirla, no con la ficha. Va en su propio `diferidos.tsx`: el del historial del panel lo
// pagaría `/cotizaciones/nuevo` (4-73). El aviso de «Sin conexión» va en su lugar (`'aqui'`).
export const CotizacionesDelLead = diferido(
  () => import('../cotizaciones-del-lead').then((modulo) => modulo.CotizacionesDelLead),
  { aviso: 'aqui', esqueleto: <EsqueletoDeLasCotizaciones /> },
)
