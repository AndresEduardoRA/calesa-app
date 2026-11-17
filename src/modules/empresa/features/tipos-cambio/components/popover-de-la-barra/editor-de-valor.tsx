'use client'

import { useEffect, useId, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { textoParaEditar } from '../../../../entities/tipos-cambio'
import type { TipoCambioVigente } from '../../../../entities/tipos-cambio-vigentes'
import { useValorEnLaBarra } from '../../hooks/use-valor-en-la-barra'
import { CampoDelValor } from './campo-del-valor'
import { ConflictoDeValor } from './conflicto-de-valor'

type Props = {
  tipo: TipoCambioVigente
  releer: () => Promise<TipoCambioVigente[] | null>
  // Cancelado o guardado.
  alCerrar: () => void
  // «Recargar» tras un conflicto: el editor vuelve a montarse con la versión que se releyó.
  alRecargar: () => void
  // Mientras hay algo escrito sin guardar, se guarda o se espera la red, el popover no se cierra al tocar afuera ni con Esc.
  alRetener: (retener: boolean) => void
}

const SIN_RED_AL_GUARDAR =
  'No hay conexión. Lo que escribiste sigue acá y se va a guardar solo cuando vuelva.'

// El valor de un tipo de cambio, editado en el popover de la barra: el campo con el valor guardado listo (el decimal del locale de la
// empresa), Enter guarda y Esc cancela. Lo que no se lee se dice junto al campo y no se envía.
export function EditorDeValor({ tipo, releer, alCerrar, alRecargar, alRetener }: Props) {
  const { locale } = useRegional()
  // La versión con la que se abrió: si la lista se relee debajo (otro guardó), guardar sigue mandando ésta y da el conflicto.
  const [base] = useState(tipo)
  const inicial = textoParaEditar(base.valor, locale)
  const [texto, setTexto] = useState(inicial)
  const editor = useValorEnLaBarra({ base, releer, alCerrar })
  const id = useId()
  const retener = texto.trim() !== inicial || editor.enCurso || editor.pendiente

  // Cerrado el editor, el popover vuelve a cerrarse como siempre.
  useEffect(() => {
    alRetener(retener)
    return () => {
      alRetener(false)
    }
  }, [retener, alRetener])

  return (
    <form
      noValidate
      className="grid min-w-0 gap-2 pt-1"
      onSubmit={(evento) => {
        evento.preventDefault()
        editor.guardar(texto, locale)
      }}
    >
      <label htmlFor={id} className="text-(length:--text-sm) text-(--color-ink-soft)">
        Valor de {tipo.nombre}: 1 {tipo.monedaDe} en {tipo.monedaA}
      </label>
      <CampoDelValor
        id={id}
        texto={texto}
        alEscribir={(nuevo) => {
          setTexto(nuevo)
          editor.decir(null)
        }}
        alCancelar={() => {
          if (!editor.enCurso) {
            editor.cancelar()
          }
        }}
        motivo={editor.motivo}
        soloLectura={editor.enCurso || editor.sinRed}
      />
      {editor.sinRed ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {SIN_RED_AL_GUARDAR}
        </p>
      ) : null}
      {editor.conflicto ? (
        <ConflictoDeValor conflicto={editor.conflicto} alRecargar={alRecargar} />
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-8"
          disabled={editor.enCurso}
          onClick={editor.cancelar}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="min-h-11 md:min-h-8"
          disabled={editor.enCurso || editor.sinRed || editor.conflicto !== null}
        >
          {editor.enCurso ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
