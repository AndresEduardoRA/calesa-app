'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeLasTarjetas } from '../../../fichas/components/esqueleto-de-las-tarjetas'

// El código de las tarjetas del vehículo llega recién al acercarse el bloque, no con la ficha (un archivo de nivel superior es efecto de módulo, 4-73).
export const TarjetasDelVehiculoDiferido = diferido(
  () => import('./tarjetas-del-vehiculo').then((modulo) => modulo.TarjetasDelVehiculo),
  { esqueleto: <EsqueletoDeLasTarjetas />, aviso: 'aqui' },
)
