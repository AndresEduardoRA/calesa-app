'use client'

import { useId } from 'react'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  alternarVisible,
  elegirModo,
  MODO_POR_DEFECTO_VISIBLE,
  type PorDefecto,
} from '../../../../entities/cabecera-por-defecto'

type Props = {
  modos: readonly { clave: string; nombre: string }[]
  valor: PorDefecto
  alCambiar: (valor: PorDefecto) => void
  // Si el diseño ofrece «Ver total» y con qué moneda se escribe: el panel de la hoja pasa la de la hoja; el editor del diseño, que no la sabe, nula («moneda local»).
  ofreceVerTotalBs: boolean
  moneda: string | null
  deshabilitado?: boolean
}

const LEYENDA = 'mb-1 text-(length:--text-sm) font-medium text-(--color-ink)'
const OPCION =
  'flex min-h-11 items-center gap-2 text-(length:--text-sm) text-(--color-ink) md:pointer-fine:min-h-8'

// Los campos «Por defecto» de la cabecera, con el mismo texto en el ⚙ de la hoja y en el diseño de Configuración (docs/GLOSARIO.md › «Modo por defecto», «Modos
// visibles»): el modo por defecto (radios con el nombre de cada modo), «Ver total» por defecto (si se ofrece) y, con dos modos o más, los visibles en el encabezado; el modo
// por defecto queda siempre visible, su casilla marcada y apagada con el motivo.
export function CamposPorDefectoDeLaCabecera({
  modos,
  valor,
  alCambiar,
  ofreceVerTotalBs,
  moneda,
  deshabilitado = false,
}: Props) {
  const nombre = useId()
  const motivo = useId()
  return (
    <div className="grid gap-5">
      <fieldset className="grid min-w-0 gap-1 border-0 p-0">
        <legend className={LEYENDA}>Tipo de cambio por defecto</legend>
        {modos.map((m) => (
          <label key={m.clave} className={OPCION}>
            <input
              type="radio"
              name={nombre}
              value={m.clave}
              checked={valor.modo === m.clave}
              disabled={deshabilitado}
              onChange={() => {
                alCambiar(elegirModo(valor, m.clave, modos))
              }}
              className="size-4 accent-(--color-primario)"
            />
            {m.nombre}
          </label>
        ))}
      </fieldset>
      {ofreceVerTotalBs ? (
        <label className={OPCION}>
          <Checkbox
            checked={valor.verTotalBs}
            disabled={deshabilitado}
            onCheckedChange={(marcada) => {
              alCambiar({ ...valor, verTotalBs: marcada })
            }}
          />
          Mostrar el total en {moneda ?? 'moneda local'} por defecto
        </label>
      ) : null}
      {modos.length >= 2 ? (
        <fieldset className="grid min-w-0 gap-1 border-0 p-0">
          <legend className={LEYENDA}>Opciones visibles en el encabezado</legend>
          {modos.map((m) => {
            const esElPorDefecto = m.clave === valor.modo
            return (
              <label key={m.clave} className={OPCION}>
                <Checkbox
                  checked={esElPorDefecto || valor.visibles.includes(m.clave)}
                  disabled={deshabilitado || esElPorDefecto}
                  aria-describedby={esElPorDefecto ? motivo : undefined}
                  onCheckedChange={() => {
                    alCambiar(alternarVisible(valor, m.clave, modos))
                  }}
                />
                {m.nombre}
              </label>
            )
          })}
          <p id={motivo} className="text-(length:--text-xs) text-(--color-ink-soft)">
            {MODO_POR_DEFECTO_VISIBLE}
          </p>
        </fieldset>
      ) : null}
    </div>
  )
}
