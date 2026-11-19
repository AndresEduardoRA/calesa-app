'use client'

import { diferido } from '@/shared/ui/diferido'

// La ficha completa llega al abrirse (`?ver=ficha`): ni su código ni los grupos del layout viajan con la ficha. Sin red, la barra de abajo dice «Sin
// conexión. No se pudo abrir esto.» con «Reintentar».
export const ModalDeFichaCompletaDiferido = diferido(
  () => import('./modal-de-ficha-completa').then((modulo) => modulo.ModalDeFichaCompleta),
  { aviso: 'pantalla' },
)
