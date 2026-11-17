'use client'

import { diferido } from '@/shared/ui/diferido'
import type { PropsDelNuevoProyectoAbierto } from './nuevo-proyecto-abierto'

// «Nuevo proyecto» con todo lo suyo (el formulario, los buscadores de vehículo y de lead, la lectura del lead vinculado y supabase-js) se pide la primera vez que
// se abre (`useAbiertoAlgunaVez`): `/repuestos` no carga su código para dibujar la lista.
export const NuevoProyectoAbiertoDiferido = diferido<PropsDelNuevoProyectoAbierto>(
  () => import('./nuevo-proyecto-abierto').then((m) => m.NuevoProyectoAbierto),
  { aviso: 'pantalla' },
)
