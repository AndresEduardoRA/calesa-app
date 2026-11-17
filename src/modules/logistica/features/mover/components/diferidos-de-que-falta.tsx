'use client'

import { diferido } from '@/shared/ui/diferido'

// Lo que «Qué falta» trae al primer uso: el modal «Pedírselo a alguien». Un archivo propio: `diferidos.tsx` lo importa la pantalla en frío.
export const ModalParaPedirloDiferido = diferido(() =>
  import('./modal-para-pedirlo').then((m) => m.ModalParaPedirlo),
)
