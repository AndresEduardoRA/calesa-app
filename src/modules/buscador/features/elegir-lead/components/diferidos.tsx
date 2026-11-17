'use client'

import { diferido } from '@/shared/ui/diferido'
import type { PropsDeElegirLead } from './elegir-lead'

// El paso de elegir un lead se pide la primera vez que se muestra: el shell lo importa en **todas** las pantallas (dentro del modal «Nuevo», que ya es diferido).
export const ElegirLeadDiferido = diferido<PropsDeElegirLead>(() =>
  import('./elegir-lead').then((m) => m.ElegirLead),
)
