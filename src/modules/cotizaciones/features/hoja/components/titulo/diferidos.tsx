'use client'

import { diferido } from '@/shared/ui/diferido'

// El campo del título se pide recién al abrir el panel del vehículo (la hoja no carga su código para dibujar la barra). Mientras llega, un hueco de su alto (etiqueta,
// campo y ayuda) para que el panel no salte.
export const CampoDelTituloDiferido = diferido(
  () => import('./campo-del-titulo').then((modulo) => modulo.CampoDelTitulo),
  {
    esqueleto: (
      <div aria-hidden className="grid gap-1.5">
        <div className="h-5 w-40 rounded-(--radius-md) bg-(--color-surface-3)" />
        <div className="h-11 rounded-(--radius-md) bg-(--color-surface-3) md:h-9" />
        <div className="h-4 w-56 rounded-(--radius-md) bg-(--color-surface-3)" />
      </div>
    ),
  },
)
