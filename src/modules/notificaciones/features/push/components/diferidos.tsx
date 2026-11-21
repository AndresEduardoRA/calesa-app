'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeUnaTarjeta } from '@/shared/ui/esqueletos'

// El código del push (el hook, la tarjeta, su modal y los interruptores) se pide al llegar a `/perfil`, no viaja en su JS en frío.
export const SeccionDeNotificacionesDiferida = diferido(
  () => import('./seccion-de-notificaciones').then((modulo) => modulo.SeccionDeNotificaciones),
  { esqueleto: <EsqueletoDeUnaTarjeta />, aviso: 'aqui' },
)
