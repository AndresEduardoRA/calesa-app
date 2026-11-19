'use client'

import { diferido } from '@/shared/ui/diferido'

// La vista previa de la tarjeta se pide recién al abrirse: la hoja no carga el modal, la tarjeta ni su lectura para dibujarse. Se monta con `useAbiertoAlgunaVez()`.
export const VistaPreviaDiferida = diferido(() =>
  import('./vista-previa-de-la-tarjeta').then((modulo) => modulo.default),
)

// El lienzo del editor de la plantilla (la pestaña «Tarjeta» de Configuración): el código de la tarjeta se pide al montar el editor, no antes; si no llega, el aviso va en su
// lugar y el editor sigue en pie. El esqueleto, de alto fijo, es un `div` y no `<Skeleton>`: este archivo viaja con la hoja (4-73) y no suma un import.
export const LienzoDeLaPlantillaDiferido = diferido(
  () => import('./lienzo-de-la-plantilla').then((modulo) => modulo.LienzoDeLaPlantilla),
  {
    esqueleto: (
      <div className="h-96 w-full animate-pulse rounded-(--radius-card) bg-(--color-surface-sunken)" />
    ),
    aviso: 'aqui',
  },
)
