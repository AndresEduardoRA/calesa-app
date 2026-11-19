'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { errorDeCampo } from '@/shared/lib/formularios'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { BarraDeCambiosSinGuardar } from '@/shared/ui/barra-de-cambios-sin-guardar'
import { Campo } from '@/shared/ui/campo'
import { useHayCambiosEnFormulario } from '@/shared/ui/use-hay-cambios-en-formulario'
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

const ID_DEL_FORMULARIO = 'formulario-de-la-vigencia'
const CAMPOS = ['vigenciaDias'] as const

// Configuración › Cotización › General › Vigencia: los días que vale una cotización, para todas. Un campo, con la barra de cambios sin guardar
// («Descartar» · «Guardar»), que aparece al cambiarlo; salir con cambios pregunta. Quien lo usa le pone de `key` la versión de la fila, así que lo
// guardado (aquí o por otra persona) lo vuelve a montar desde la base. En sólo lectura, el motivo y sin barra. El título y la frase los pone la página.
export function FormularioDeAjustesDeCotizacion({ ajustes, puedeCambiar, puedeIrARoles }: Props) {
  const { formulario, hayCambios } = useHayCambiosEnFormulario(CAMPOS)
  const { guardar, enCurso, errores } = useGuardarAjustesDeCotizacion({
    actualizadoEn: ajustes.actualizadoEn,
    formulario,
  })
  const bloqueado = !puedeCambiar || enCurso

  return (
    <>
      <form
        ref={formulario}
        id={ID_DEL_FORMULARIO}
        noValidate
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void guardar()
        }}
      >
        {puedeCambiar ? null : <Aviso>{MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION}</Aviso>}
        {/* Un <fieldset> deshabilitado apaga los campos de adentro, también para el teclado. */}
        <fieldset disabled={bloqueado} className="grid min-w-0 gap-4">
          <legend className="sr-only">Vigencia</legend>
          <Campo
            nombre="vigenciaDias"
            etiqueta="Vigencia (días)"
            type="number"
            inputMode="numeric"
            min={VIGENCIA_MINIMA_DIAS}
            max={VIGENCIA_MAXIMA_DIAS}
            defaultValue={ajustes.vigenciaDias}
            ayuda="Desde el día en que se creó, para todas las cotizaciones de todos los orígenes. Cambia también cuándo vence cada cotización ya guardada."
            error={errorDeCampo(errores, 'vigenciaDias')}
          />
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
      </form>
      {puedeCambiar ? (
        <BarraDeCambiosSinGuardar
          formulario={ID_DEL_FORMULARIO}
          hayCambios={hayCambios}
          guardando={enCurso}
          alDescartar={() => {
            const elemento = formulario.current
            elemento?.reset()
            // `reset()` no dispara `input` ni `change`: se avisa para que la barra vuelva a medir.
            elemento?.dispatchEvent(new Event('change'))
          }}
        />
      ) : null}
    </>
  )
}
