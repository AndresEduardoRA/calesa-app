'use client'

import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { rutaDeLasFormulas } from '@/shared/lib/rutas'
import { EsquinaDeAcciones, MasAcciones } from '@/shared/ui/lista'
import type { FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'
import { CLAVE_DE_LA_COPIA, PANEL_NUEVA_FORMULA } from '../../../entities/formulas-del-origen/rutas'
import { usePanelesDeLaFormula } from '../hooks/use-paneles-de-la-formula'
import { EstadoDeLaFormula } from './estado-de-la-formula'

type Props = {
  origen: { id: string; nombre: string }
  formula: FormulaDeLaLista
  activa: { id: string; nombre: string } | null
}

// La cabeza del editor de una fórmula del origen (`…/formulas/<id>/planilla|hoja|tarjeta`): «‹ Fórmulas», el nombre, el estado y el «⋯» (el mismo de su fila en la
// lista). «Copiar» lleva a la lista con «Nueva fórmula» abierto; archivar o eliminar vuelven a la lista. Las sub-pestañas las pone `src/app` debajo.
export function CabezaDeLaFormulaDelOrigen({ origen, formula, activa }: Props) {
  const router = useRouter()
  const { menuDe, paneles } = usePanelesDeLaFormula({
    origen,
    formulas: [formula],
    activa,
    alCopiar: (copia) => {
      router.push(
        rutaDeLasFormulas(origen.id, {
          [CLAVE_DE_PANEL]: PANEL_NUEVA_FORMULA,
          [CLAVE_DE_LA_COPIA]: copia.id,
        }),
      )
    },
    volverALaLista: true,
  })
  return (
    <div className="grid min-w-0 gap-1">
      <Link
        href={rutaDeLasFormulas(origen.id)}
        className="inline-flex min-h-11 w-fit items-center gap-1 text-(length:--text-sm) text-(--color-ink-soft) hover:text-(--color-ink) md:min-h-8"
      >
        <ChevronLeftIcon aria-hidden className="size-4" />
        Fórmulas
      </Link>
      <div className="flex min-w-0 items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="min-w-0 text-(length:--text-lg) font-semibold break-words text-(--color-ink)">
            {formula.nombre}
          </h2>
          <EstadoDeLaFormula formula={formula} />
        </div>
        <EsquinaDeAcciones>
          <MasAcciones
            nombre={formula.nombre}
            id={`formula-${formula.id}`}
            conBorde
            acciones={menuDe(formula)}
          />
        </EsquinaDeAcciones>
      </div>
      {paneles}
    </div>
  )
}
