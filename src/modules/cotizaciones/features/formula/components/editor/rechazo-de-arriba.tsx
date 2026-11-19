'use client'

import type { RechazoEnElEditor } from '../../hooks/use-editor-de-la-formula'

// Un rechazo de `validarFormula()` que no nombra una fila ni un grupo (la fórmula entera: `total_unico`…) va arriba de la lista del Modo avanzado y de la planilla.
export function RechazoDeArriba({ rechazo }: { rechazo: RechazoEnElEditor | null }) {
  if (rechazo === null || rechazo.filaId !== null || rechazo.grupoId !== null) return null
  return (
    <p
      role="alert"
      className="rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(length:--text-sm) text-(--color-aviso-ink)"
    >
      {rechazo.mensaje}
    </p>
  )
}
