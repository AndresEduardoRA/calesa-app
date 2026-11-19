import type { Route } from 'next'
import Link from 'next/link'
import { parteGeneral, type ClaveGeneral } from './seccion'

type Props = {
  // Las partes generales que la persona ve (`pestanasGenerales()`); con `motivo`, apagada.
  pestanas: readonly { clave: ClaveGeneral; titulo: string; ruta: string; motivo?: string }[]
}

// La tarjeta «General» del inicio de Configuración › Cotización: lo que vale para toda la empresa. Cada parte que la persona abre es un enlace
// con su frase; la que no abre y declara su motivo (Niveles, para quien configura sin ver los roles) va apagada con el motivo.
export function TarjetaGeneral({ pestanas }: Props) {
  return (
    <li className="grid min-w-0 content-start gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4">
      <div className="grid gap-0.5">
        <p className="text-(length:--text-base) font-medium text-(--color-ink)">General</p>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Lo que vale para toda la empresa.
        </p>
      </div>
      <ul aria-label="Partes generales" className="grid gap-1">
        {pestanas.map((pestana) => {
          const frase = parteGeneral(pestana.clave).descripcion
          return (
            <li key={pestana.clave}>
              {pestana.motivo === undefined ? (
                <Link
                  href={pestana.ruta as Route}
                  className="-mx-2 grid min-h-11 content-center rounded-(--radius-md) px-2 py-1 outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:min-h-9"
                >
                  <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
                    {pestana.titulo}
                  </span>
                  <span className="text-(length:--text-xs) text-(--color-ink-soft)">{frase}</span>
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  className="-mx-2 grid min-h-11 content-center px-2 py-1 md:min-h-9"
                >
                  <span className="text-(length:--text-sm) text-(--color-ink-faint)">
                    {pestana.titulo}
                  </span>
                  <span className="text-(length:--text-xs) text-(--color-ink-soft)">
                    {pestana.motivo}
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </li>
  )
}
