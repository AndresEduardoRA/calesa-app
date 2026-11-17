'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeFotos } from './esqueleto-de-fotos'

// El bloque «Fotos» de la ficha (subida, bandeja y galería) se pide al acercarse: no pesa en el JS en frío de la ficha.
export const SeccionDeFotosDiferida = diferido(
  () => import('./seccion-de-fotos').then((modulo) => modulo.SeccionDeFotos),
  { esqueleto: <EsqueletoDeFotos />, aviso: 'aqui' },
)
