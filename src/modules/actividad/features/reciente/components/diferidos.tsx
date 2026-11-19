'use client'

import { diferido } from '@/shared/ui/diferido'
import { FilasDelEsqueleto } from './esqueleto-de-actividad-reciente'

// El código de las filas de la «Actividad reciente» llega recién al acercarse el bloque (la ficha del vehículo sólo paga la cáscara). Va en su propio
// `diferidos.tsx` (un `diferido()` de nivel superior es efecto de módulo, 4-73). Sin red, el aviso va en el lugar del bloque.
export const ListaRecienteDiferida = diferido(
  () => import('./lista-reciente-del-navegador').then((modulo) => modulo.ListaRecienteDelNavegador),
  { esqueleto: <FilasDelEsqueleto />, aviso: 'aqui' },
)
