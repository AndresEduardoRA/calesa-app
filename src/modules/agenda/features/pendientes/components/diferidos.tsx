'use client'

import { diferido } from '@/shared/ui/diferido'
import type { PropsDeMasPendientes } from './mas-pendientes'

// «Ver más» de un grupo de pendientes: su código y su lectura del navegador se piden recién al tocarlo (la columna llega del servidor).
export const MasPendientesDiferido = diferido<PropsDeMasPendientes>(() =>
  import('./mas-pendientes').then((modulo) => modulo.MasPendientes),
)
