'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeLasTarjetas } from '../../../fichas/components/esqueleto-de-las-tarjetas'

// El código de las tarjetas de una ficha llega recién al acercarse el bloque, no con la ficha: la página sólo paga estas cáscaras. Cada una en su `diferido()` (un archivo de
// nivel superior es efecto de módulo, 4-73). Sin red, el aviso va en el lugar del bloque (`'aqui'`).
export const TarjetasDelLeadDiferido = diferido(
  () => import('./tarjetas-del-lead').then((modulo) => modulo.TarjetasDelLead),
  { esqueleto: <EsqueletoDeLasTarjetas />, aviso: 'aqui' },
)

// La fila de tarjetas que `aprobada` pide por hueco para el vehículo: su código llega cuando la isla del vehículo ya se dibuja.
export const TarjetasDeLaFichaDiferida = diferido(
  () => import('./tarjetas-de-la-ficha').then((modulo) => modulo.TarjetasDeLaFicha),
  { esqueleto: <EsqueletoDeLasTarjetas />, aviso: 'aqui' },
)
