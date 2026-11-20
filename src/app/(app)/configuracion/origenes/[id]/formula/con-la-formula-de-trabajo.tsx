import type { ReactNode } from 'react'
import { leerFormulaDeTrabajo, type FormulaDelOrigen } from '@/modules/cotizaciones'
import { datosO } from '@/shared/lib/errores'

// Las sub-pestañas de la Fórmula editan la fórmula de trabajo del origen: la lee con la sesión (detrás del `<Suspense>` de la página) y dibuja lo de esa fórmula. Sin
// ninguna, lo dice. Una lectura que falla sube al `error.tsx` de la ruta, con «Reintentar».
export async function ConLaFormulaDeTrabajo({
  origenId,
  children,
}: {
  origenId: string
  children: (formula: FormulaDelOrigen) => ReactNode
}) {
  const formula = datosO(await leerFormulaDeTrabajo(origenId))
  if (formula === null) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Este origen todavía no tiene una fórmula.
      </p>
    )
  }
  return children(formula)
}
