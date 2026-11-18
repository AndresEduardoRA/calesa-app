'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'
import {
  conRed,
  enfocarPrimerError,
  errorDeCampo,
  resultadoDeAccion,
} from '@/shared/lib/formularios'
import { BarraDeCambiosSinGuardar } from '@/shared/ui/barra-de-cambios-sin-guardar'
import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { numeroDeComprobante } from '../../../entities/comprobantes/comprobante'
import {
  esquemaDeSerie,
  SERIE_MAXIMA,
  type SerieVigente,
} from '../../../entities/comprobantes/serie'
import { cambiarSerie } from '../actions/cambiar-serie'
import { DatosDeLaSerie } from './datos-de-la-serie'

type Props = {
  vigente: SerieVigente
  // `empresa.ajustes.gestionar`: sin eso se lee y no se cambia.
  puedeCambiar: boolean
}

const AYUDA =
  'De 1 a 12 letras, números o guiones. Una serie nueva empieza en 1; volver a una usada sigue su numeración.'

const ID_DEL_FORMULARIO = 'serie-de-comprobantes'

// La serie de comprobantes en Configuración › Empresa (4.26-3): la vigente, el próximo número y el campo para cambiarla, que se guarda con la barra de cambios
// sin guardar (hermana del bloque: es lo último de la página). Quien lo usa le pone de `key` la versión
// de la fila, así que lo guardado (aquí o por otra persona) lo vuelve a montar desde la base. Un cambio ajeno da PT409 con «Recargar» (`avisarError`); lo tipeado
// queda siempre.
export function FormularioDeSerie({ vigente, puedeCambiar }: Props) {
  const formulario = useRef<HTMLFormElement>(null)
  const [serie, setSerie] = useState(vigente.serie)
  const [motivo, setMotivo] = useState<string | null>(null)
  const { executeAsync, result, isPending } = useAction(cambiarSerie)
  const sinCambios = serie.trim().toUpperCase() === vigente.serie

  async function guardar(): Promise<void> {
    const leida = esquemaDeSerie.safeParse(serie)
    if (!leida.success) {
      setMotivo(leida.error.issues[0]?.message ?? '')
      enfocarPrimerError(formulario.current)
      return
    }
    const resultado = resultadoDeAccion(
      await conRed(executeAsync({ serie: leida.data, actualizadoEn: vigente.actualizadoEn })),
    )
    if (!resultado.ok) {
      if (resultado.error.codigo !== 'validacion') {
        avisarError(resultado.error)
      }
      enfocarPrimerError(formulario.current)
      return
    }
    avisarExito(
      `La serie vigente es ${resultado.data.serie}: el próximo comprobante es ${numeroDeComprobante(resultado.data.serie, resultado.data.siguiente)}.`,
    )
  }

  return (
    <>
      <Bloque titulo="Serie de comprobantes">
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
          <DatosDeLaSerie vigente={vigente} />
          {puedeCambiar ? (
            <fieldset disabled={isPending} className="grid min-w-0 gap-4">
              <legend className="sr-only">Cambiar la serie</legend>
              <Campo
                nombre="serie"
                etiqueta="Serie"
                value={serie}
                maxLength={SERIE_MAXIMA}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                ayuda={AYUDA}
                error={motivo ?? errorDeCampo(result.validationErrors?.fieldErrors, 'serie')}
                onChange={(evento) => {
                  setSerie(evento.target.value)
                  setMotivo(null)
                }}
              />
            </fieldset>
          ) : null}
        </form>
      </Bloque>
      {puedeCambiar ? (
        <BarraDeCambiosSinGuardar
          formulario={ID_DEL_FORMULARIO}
          hayCambios={!sinCambios}
          guardando={isPending}
          alDescartar={() => {
            setSerie(vigente.serie)
            setMotivo(null)
          }}
        />
      ) : null}
    </>
  )
}
