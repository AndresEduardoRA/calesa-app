'use client'

import { StarIcon } from 'lucide-react'
import Link from 'next/link'
import { rutaDeLaFormula } from '@/shared/lib/rutas'
import { EsquinaDeAcciones, MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import type { FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'
import { EstadoDeLaFormula } from './estado-de-la-formula'

type Props = {
  origenId: string
  formula: FormulaDeLaLista
  acciones: AccionDeMenu[]
}

// Una fórmula del origen en la lista: ★ sólo en la activa, el nombre como enlace a su planilla, el estado, «Editar» y el «⋯» arriba a la derecha.
export function FilaDeFormula({ origenId, formula, acciones }: Props) {
  const planilla = rutaDeLaFormula(origenId, formula.id, 'planilla')
  return (
    <li
      data-formula-del-origen={formula.id}
      className="flex min-w-0 items-start gap-2 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm)"
    >
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {formula.activa ? (
            <StarIcon
              aria-label="Activa"
              className="size-4 shrink-0 fill-current text-(--color-ink)"
            />
          ) : null}
          <Link
            href={planilla}
            className="font-semibold break-words text-(--color-ink) underline-offset-4 hover:underline"
          >
            {formula.nombre}
          </Link>
          <EstadoDeLaFormula formula={formula} />
        </div>
      </div>
      <Link
        href={planilla}
        aria-label={`Editar «${formula.nombre}»`}
        className="inline-flex min-h-11 shrink-0 items-center rounded-(--radius-md) px-3 font-medium text-(--color-ink) hover:bg-(--color-paper-dim) md:min-h-9"
      >
        Editar
      </Link>
      <EsquinaDeAcciones>
        <MasAcciones nombre={formula.nombre} acciones={acciones} />
      </EsquinaDeAcciones>
    </li>
  )
}
