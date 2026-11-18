'use client'

import { useState } from 'react'
import { errorDeCampo } from '@/shared/lib/formularios'
import { BarraDeCambiosSinGuardar } from '@/shared/ui/barra-de-cambios-sin-guardar'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  caracteresDeLaLeyenda,
  LEYENDA_MAXIMA,
  type LeyendaDeTiposCambio,
} from '../../../entities/compartir-tipos-cambio'
import { MOTIVO_SIN_PERMISO_TIPOS_CAMBIO } from '../../../entities/motivos'
import { useGuardarLeyenda } from '../hooks/use-guardar-leyenda'

type Props = {
  leyenda: LeyendaDeTiposCambio
  puedeGestionar: boolean
}

const ID_DEL_FORMULARIO = 'leyenda-tipos-cambio-formulario'

// «Leyenda al compartir»: el texto al pie de la imagen y del texto que se comparten con un cliente. Un campo que se guarda con la barra de
// cambios sin guardar (hermana de la sección, `order-last`: queda al final de la página, pegada abajo): sin borrador. Quien lo monta le
// pone de `key` la versión de la fila, así que lo guardado (aquí o por otra persona) lo vuelve a montar desde la base. Sin `maxLength`, que cuenta
// unidades UTF-16: el tope lo dice «n de 120» y el motivo sale junto al campo.
export function LeyendaDeLosTiposCambio({ leyenda, puedeGestionar }: Props) {
  const [texto, setTexto] = useState(leyenda.leyenda ?? '')
  const { guardar, enCurso, errores } = useGuardarLeyenda(leyenda.actualizadoEn)
  const caracteres = caracteresDeLaLeyenda(texto.trim())
  const pasada = caracteres > LEYENDA_MAXIMA
  const error = pasada
    ? `La leyenda admite hasta ${String(LEYENDA_MAXIMA)} caracteres.`
    : errorDeCampo(errores, 'leyenda')
  const cambio = texto.trim() !== (leyenda.leyenda ?? '')

  return (
    <>
      <section aria-labelledby="leyenda-titulo" className="grid gap-3">
        <h2 id="leyenda-titulo" className="text-(length:--text-lg) font-medium text-(--color-ink)">
          Leyenda al compartir
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Desde la barra superior se comparten con un cliente como imagen o como texto. La leyenda
          va al pie de los dos.
        </p>
        <form
          id={ID_DEL_FORMULARIO}
          noValidate
          className="grid max-w-xl gap-3"
          onSubmit={(evento) => {
            evento.preventDefault()
            if (!pasada) {
              void guardar(texto)
            }
          }}
        >
          <fieldset disabled={!puedeGestionar || enCurso} className="grid min-w-0 gap-1.5">
            <legend className="sr-only">Leyenda de los tipos de cambio</legend>
            <Label htmlFor="leyenda-tipos-cambio">Leyenda</Label>
            <Input
              id="leyenda-tipos-cambio"
              name="leyenda"
              value={texto}
              placeholder="Valores referenciales"
              className="h-11 md:h-9"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'leyenda-error leyenda-cuenta' : 'leyenda-cuenta'}
              onChange={(evento) => {
                setTexto(evento.target.value)
              }}
            />
            {error ? (
              <p id="leyenda-error" className="text-(length:--text-sm) text-(--color-peligro-ink)">
                {error}
              </p>
            ) : null}
            <p id="leyenda-cuenta" className="text-(length:--text-sm) text-(--color-ink-faint)">
              {caracteres} de {LEYENDA_MAXIMA}. Vacía, no se muestra.
            </p>
          </fieldset>
          {puedeGestionar ? null : (
            <p className="text-(length:--text-sm) text-(--color-ink-faint)">
              {MOTIVO_SIN_PERMISO_TIPOS_CAMBIO}
            </p>
          )}
        </form>
      </section>
      <BarraDeCambiosSinGuardar
        className="order-last"
        formulario={ID_DEL_FORMULARIO}
        hayCambios={puedeGestionar && cambio}
        guardando={enCurso}
        alDescartar={() => {
          setTexto(leyenda.leyenda ?? '')
        }}
      />
    </>
  )
}
