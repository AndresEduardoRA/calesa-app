import { CircleDashedIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { TOPE_DEL_CONTEO, conteoAcotado, conteoEnFrase } from '@/shared/lib/conteo'
import { TOPE_DE_FALTAS, type FaltasPorSeccion, type SeccionConFaltas } from './que-falta'

// Lo que falta en una tarjeta del inicio: las primeras `TOPE_DE_FALTAS`, cada una con su enlace al paso, y cuántas más. Llega después de
// las tarjetas (va en su `<Suspense>`): sin nada que falte, o si no se pudo leer, no dibuja nada.
export async function QueFaltaDeLaSeccion({
  faltas,
  seccion,
}: {
  faltas: Promise<FaltasPorSeccion>
  seccion: SeccionConFaltas
}) {
  const lista = (await faltas)[seccion] ?? []
  if (lista.length === 0) {
    return null
  }
  const resto = lista.length - TOPE_DE_FALTAS
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
      {lista.slice(0, TOPE_DE_FALTAS).map((falta) => (
        <li key={falta.clave} className="flex min-w-0 items-start gap-2">
          <CircleDashedIcon
            aria-hidden
            className="mt-3 size-4 shrink-0 text-(--color-ink-faint) md:mt-1.5"
          />
          <Link
            // Las rutas de los pasos existen: lo comprueba origenes/pasos.test.ts contra el disco.
            href={falta.ruta as Route}
            className="flex min-h-[44px] min-w-0 items-center rounded-(--radius-md) text-(length:--text-sm) break-words text-(--color-primario-ink) underline-offset-4 outline-none hover:underline focus-visible:shadow-(--shadow-focus) md:min-h-7"
          >
            {falta.texto}
          </Link>
        </li>
      ))}
      {resto > 0 ? (
        <li className="pl-6 text-(length:--text-sm) text-(--color-ink-soft)">
          Y {conteoEnFrase(conteoAcotado(resto, TOPE_DEL_CONTEO))} más
        </li>
      ) : null}
    </ul>
  )
}
