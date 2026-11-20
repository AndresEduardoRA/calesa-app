'use client'

import { diferido } from '@/shared/ui/diferido'

// El modal de las cotizaciones de un vehículo llega recién al primer clic en «N cotizaciones de este vehículo» (o al abrir su enlace): la lista no paga sus líneas, su lectura
// ni «Comparar». Mientras llega no hay nada que mostrar (un modal no tiene lugar propio); sin red, el aviso va en una barra fija con «Reintentar».
export const ModalDelGrupoDiferido = diferido(() =>
  import('./modal-del-grupo').then((modulo) => modulo.ModalDelGrupo),
)
