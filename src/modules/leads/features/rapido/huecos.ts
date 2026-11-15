import type { ComponentType } from 'react'

// Lo que `src/app` llena en el resumen de un lead (`leads` no importa `vehiculos`): el bloque «Relacionados» entre la cabecera y las pestañas, por el id del lead abierto.
export type HuecosDelRapido = { Relacionados?: ComponentType<{ leadId: string }> }
