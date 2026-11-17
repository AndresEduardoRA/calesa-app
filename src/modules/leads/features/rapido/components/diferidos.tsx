'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

// Los teléfonos del resumen (el principal y los extras, sólo lectura): se piden al mostrar «Resumen», no al abrir el listado.
export const TelefonosDelResumenDiferido = diferido(
  () => import('./telefonos-del-resumen').then((modulo) => modulo.TelefonosDelResumen),
  {
    esqueleto: <Skeleton aria-label="Cargando los teléfonos" className="h-4 w-2/3" />,
    aviso: 'aqui',
  },
)

// El panel de edición del resumen: se pide al pulsar «Editar», no al abrir el resumen. Sin red, el aviso va en una barra fija.
export const EdicionDelResumenDiferido = diferido(() =>
  import('./edicion-del-resumen').then((modulo) => modulo.EdicionDelResumen),
)
