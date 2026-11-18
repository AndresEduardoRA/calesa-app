'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeEsteVehiculo } from './esqueleto-de-este-vehiculo'

// El código de «De este vehículo» llega recién al acercarse el bloque (la guardada) o al abrir el resumen (el listado): las dos páginas sólo pagan esta cáscara.
// Va en su propio `diferidos.tsx` (un `diferido()` de nivel superior es efecto de módulo, 4-73). Sin red, el aviso va en el lugar del bloque.
export const DeEsteVehiculoDiferido = diferido(
  () => import('./de-este-vehiculo').then((modulo) => modulo.DeEsteVehiculo),
  { esqueleto: <EsqueletoDeEsteVehiculo />, aviso: 'aqui' },
)
