'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useRef } from 'react'
import { errorDeCampo } from '@/shared/lib/formularios'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import {
  VIGENCIA_MAXIMA_DIAS,
  VIGENCIA_MINIMA_DIAS,
  type AjustesDeCotizacion,
} from '../../../entities/ajustes-de-cotizacion'
import { MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION } from '../../../entities/motivos'
import { useGuardarAjustesDeCotizacion } from '../hooks/use-guardar-ajustes-de-cotizacion'

type Props = {
  ajustes: AjustesDeCotizacion
  // Configurar el cotizador en todos los orígenes (`puedeCambiarAjustesDeCotizacion`): sin eso se leen y no se cambian.
  puedeCambiar: boolean
  // Quien puede ver o gestionar los roles (`equipo.roles.ver` o `equipo.roles.gestionar`): ve el enlace a «Roles y permisos».
  puedeIrARoles: boolean
}

// Configuración › Cotización › Ajustes: la vigencia, que vale para todas las cotizaciones. Un campo: sin borrador. Quien lo usa le pone de `key` la versión de la fila, así que lo guardado (aquí o por otra persona)
// lo vuelve a montar desde la base.
export function FormularioDeAjustesDeCotizacion({ ajustes, puedeCambiar, puedeIrARoles }: Props) {
  const formulario = useRef<HTMLFormElement>(null)
  const { guardar, enCurso, errores } = useGuardarAjustesDeCotizacion({
    actualizadoEn: ajustes.actualizadoEn,
    formulario,
  })
  const bloqueado = !puedeCambiar || enCurso

  return (
    <form
      ref={formulario}
      noValidate
      className="grid gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar()
      }}
    >
      <h2 className="text-(length:--text-lg) font-semibold text-(--color-ink)">Ajustes</h2>
      {/* Un <fieldset> deshabilitado apaga los campos de adentro, también para el teclado. */}
      <fieldset disabled={bloqueado} className="grid min-w-0 gap-4">
        <legend className="sr-only">Ajustes de cotización</legend>
        {puedeCambiar ? null : <Aviso>{MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION}</Aviso>}
        <Bloque
          titulo="Vigencia"
          descripcion="Vale para todas las cotizaciones de todos los orígenes."
        >
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <Campo
              nombre="vigenciaDias"
              etiqueta="Vigencia (días)"
              type="number"
              inputMode="numeric"
              min={VIGENCIA_MINIMA_DIAS}
              max={VIGENCIA_MAXIMA_DIAS}
              defaultValue={ajustes.vigenciaDias}
              ayuda="Cuántos días vale una cotización desde el día en que se creó. Cambia también cuándo vence cada cotización ya guardada."
              error={errorDeCampo(errores, 'vigenciaDias')}
            />
          </div>
        </Bloque>
      </fieldset>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Si una cotización pide vehículo y lead se decide por rol y origen en «Roles y permisos».{' '}
        {puedeIrARoles ? (
          <Link
            href={RUTAS.roles as Route}
            className="font-medium text-(--color-primario-ink) underline-offset-4 outline-none hover:underline focus-visible:shadow-(--shadow-focus)"
          >
            Ir a Roles y permisos
          </Link>
        ) : null}
      </p>
      {puedeCambiar ? (
        <div>
          <Button type="submit" className="h-11 md:h-9" disabled={enCurso}>
            {enCurso ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      ) : null}
    </form>
  )
}
