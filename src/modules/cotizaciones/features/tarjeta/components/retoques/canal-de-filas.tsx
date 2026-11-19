'use client'

import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { cn } from 'cn'
import type { FilaDelModo } from '../../../../entities/tarjeta/retoques/modo-de-la-tarjeta'

type Props = {
  filas: readonly FilaDelModo[]
  escala: number
  alto: number
  // La fila bajo el puntero, con el foco o elegida: su control dice «Ocultar fila» o «Mostrar fila».
  activa: string | null
  enCurso: boolean
  alAlternar: (id: string) => void
  alPasar: (id: string | null) => void
  alEnfocar: (id: string | null) => void
}

// El ojo cabe en su banda (en el celular una fila escalada mide ≈ 11 px): de 8 a 16 px, sin pisar la de al lado.
const ladoDelOjo = (alto: number) => Math.max(8, Math.min(16, Math.floor(alto) - 2))

// El canal de 44 px a la derecha de la tarjeta: un botón por fila, del alto de su banda, con el ojo (la fila oculta) o el ojo tachado (para ocultarla). Siempre
// a la vista, también en el celular; la píldora con el texto aparece en la fila activa.
export function CanalDeFilas({
  filas,
  escala,
  alto,
  activa,
  enCurso,
  alAlternar,
  alPasar,
  alEnfocar,
}: Props) {
  return (
    <div className="relative" style={{ height: alto * escala }} data-canal-de-filas="">
      {filas.map((f) => (
        <button
          key={f.id}
          type="button"
          data-fila-del-canal={f.id}
          aria-pressed={f.oculta}
          aria-label={f.oculta ? `Mostrar la fila «${f.rotulo}»` : `Ocultar la fila «${f.rotulo}»`}
          disabled={enCurso}
          className={cn(
            'absolute right-0 flex w-[44px] items-center justify-center rounded-(--radius-sm) text-(--color-ink-soft) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus)',
            f.oculta && 'text-(--color-ink)',
          )}
          style={{ top: f.y * escala, height: f.alto * escala }}
          onPointerEnter={() => {
            alPasar(f.id)
          }}
          onPointerLeave={() => {
            alPasar(null)
          }}
          onFocus={() => {
            alEnfocar(f.id)
          }}
          onBlur={() => {
            alEnfocar(null)
          }}
          onClick={() => {
            alAlternar(f.id)
          }}
        >
          {f.oculta ? (
            <EyeIcon aria-hidden size={ladoDelOjo(f.alto * escala)} />
          ) : (
            <EyeOffIcon aria-hidden size={ladoDelOjo(f.alto * escala)} />
          )}
          {activa === f.id ? (
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-full z-10 mr-1 -translate-y-1/2 rounded-full bg-(--color-ink) px-2 py-0.5 text-xs whitespace-nowrap text-(--color-surface) shadow"
            >
              {f.oculta ? 'Mostrar fila' : 'Ocultar fila'}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
