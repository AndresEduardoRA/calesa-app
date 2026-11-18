'use client'

import { BadgeCheckIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useId } from 'react'
import { buttonVariants } from '@/shared/ui/button'
import { rutaDeLaCotizacion } from '../../../../entities/ruta-de-la-hoja'

type Props = {
  id: string
  // Es la aprobada: no lleva «Aprobar esta».
  aprobada: boolean
  // Es la que se mira: no lleva «Abrir».
  esta: boolean
  // Por qué no se puede aprobar (sin permiso en el origen, inválida); nulo = se puede.
  motivo: string | null
  aprobando: boolean
  // Alguna del bloque se está aprobando: un envío a la vez.
  ocupado: boolean
  alAprobar: () => void
}

const BOTON = 'min-h-11 w-full @lg/de-este:w-auto md:min-h-9'

// Las acciones de una fila: «Aprobar esta» (la principal) y «Abrir». Apagado, el botón dice su motivo debajo (`aria-describedby`). En una columna angosta, a todo
// el ancho; desde 32 rem de bloque, a la derecha.
export function AccionesDeLaFila({
  id,
  aprobada,
  esta,
  motivo,
  aprobando,
  ocupado,
  alAprobar,
}: Props) {
  const idDelMotivo = useId()
  return (
    <div className="grid min-w-0 content-start gap-2 @lg/de-este:flex @lg/de-este:flex-wrap @lg/de-este:justify-end">
      {aprobada ? null : (
        <button
          type="button"
          className={buttonVariants({ variant: 'outline', className: BOTON })}
          disabled={motivo !== null || ocupado}
          aria-describedby={motivo === null ? undefined : idDelMotivo}
          onClick={alAprobar}
        >
          <BadgeCheckIcon aria-hidden />
          {aprobando ? 'Aprobando…' : 'Aprobar esta'}
        </button>
      )}
      {esta ? null : (
        <Link
          href={rutaDeLaCotizacion(id) as Route}
          className={buttonVariants({ variant: 'ghost', className: BOTON })}
        >
          Abrir
        </Link>
      )}
      {motivo === null || aprobada ? null : (
        <p
          id={idDelMotivo}
          className="text-(length:--text-sm) text-(--color-ink-soft) @lg/de-este:max-w-64 @lg/de-este:basis-full @lg/de-este:text-right"
        >
          {motivo}
        </p>
      )}
    </div>
  )
}
