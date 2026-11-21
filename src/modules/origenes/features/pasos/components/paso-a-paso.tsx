import type { Route } from 'next'
import Link from 'next/link'
import { Badge } from '@/shared/ui/badge'
import type { EstadoDelPaso } from '../../../entities/puesta-en-marcha'

// Un paso ya resuelto por `src/app`: su ruta (nula, el paso todavía no se abre: «Datos» en `/nuevo`, antes de que el origen exista) y, sin el
// permiso en este origen, su motivo.
export type PasoDelPasoAPaso = {
  clave: string
  titulo: string
  estado: EstadoDelPaso
  ruta: string | null
  motivo: string | null
}

const INSIGNIA: Record<EstadoDelPaso, { texto: string; clase: string }> = {
  hecho: { texto: 'Hecho', clase: 'bg-(--color-positivo-soft) text-(--color-positivo-ink)' },
  pendiente: { texto: 'Pendiente', clase: 'bg-(--color-aviso-soft) text-(--color-aviso-ink)' },
  sin_permiso: { texto: 'Sin permiso', clase: 'bg-(--color-surface-3) text-(--color-ink-soft)' },
}

const FILA =
  'flex min-w-0 items-start gap-3 rounded-(--radius-md) px-2 py-2 text-(length:--text-sm)'

function Contenido({ paso, numero }: { paso: PasoDelPasoAPaso; numero: number }) {
  const insignia = INSIGNIA[paso.estado]
  return (
    <>
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-full border border-(--color-line-strong) text-(length:--text-xs) font-medium text-(--color-ink-soft)"
      >
        {numero}
      </span>
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-(--color-ink)">{paso.titulo}</span>
          <Badge className={insignia.clase}>{insignia.texto}</Badge>
        </span>
        {paso.motivo === null ? null : (
          <span className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
            {paso.motivo}
          </span>
        )}
      </span>
    </>
  )
}

// El paso a paso de la puesta en marcha (glosario): seis pasos fijos, cada uno con su número, su título y si está hecho, pendiente o sin permiso
// (apagado, con el motivo y sin enlace). El actual lleva `aria-current="step"`. En escritorio es la columna angosta de la izquierda, fija al
// bajar; en el celular, una lista compacta arriba. Sin JS: es del servidor.
export function PasoAPaso({
  pasos,
  actual,
}: {
  pasos: readonly PasoDelPasoAPaso[]
  actual: string | null
}) {
  return (
    <nav
      aria-label="Pasos de la puesta en marcha"
      className="min-w-0 md:sticky md:top-4 md:self-start"
    >
      <ol className="grid gap-1">
        {pasos.map((paso, i) => {
          const esActual = paso.clave === actual
          const marca = esActual ? 'bg-(--color-surface-3)' : ''
          return (
            <li key={paso.clave} className="min-w-0" aria-current={esActual ? 'step' : undefined}>
              {paso.motivo !== null || paso.ruta === null ? (
                <div className={`${FILA} ${marca}`}>
                  <Contenido paso={paso} numero={i + 1} />
                </div>
              ) : (
                <Link
                  // La ruta la declara `src/app` y un test comprueba que existe.
                  href={paso.ruta as Route}
                  className={`${FILA} ${marca} min-h-11 outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:min-h-9`}
                >
                  <Contenido paso={paso} numero={i + 1} />
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
