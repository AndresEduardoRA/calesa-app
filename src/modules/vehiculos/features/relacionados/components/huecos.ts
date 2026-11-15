import type { ComponentType } from 'react'

// Lo que recibe el selector de leads de «Vincular a un lead» y «Marcar un interesado» (desde un vehículo): el panel lo arma `src/app` con el de `leads` (`vehiculos` no conoce `leads`).
export type PropsDeElegirLead = {
  abierto: boolean
  alCerrar: () => void
  // El lead elegido: quien monta el panel decide (vincularlo o marcarlo) y, si no sale, lo dice en `error`.
  alElegir: (leadId: string) => void
  // «Vincular a un lead» o «Marcar un interesado».
  titulo: string
  error: string | null
  // `leads.numero_global.ver`: lo decide la página con `puede()`.
  numeroGlobal: boolean
}

// Lo que `src/app` llena en el bloque de un vehículo (ver `src/app/(app)/_relacionados/`).
export type HuecosDeRelacionados = { ElegirLead?: ComponentType<PropsDeElegirLead> }
