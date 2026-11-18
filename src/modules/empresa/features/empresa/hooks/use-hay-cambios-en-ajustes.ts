'use client'

import { useEffect, useState, type RefObject } from 'react'
import { valoresDe, valoresGuardadosDe } from '@/shared/lib/formularios'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import { CAMPOS_DE_AJUSTES, type LogosElegidos } from './use-guardar-ajustes'

type Opciones = {
  ajustes: AjustesEmpresa
  logos: LogosElegidos
  interruptores: { registroAbierto: boolean; limpiezaAutomatica: boolean }
  puedeEditar: boolean
  // Mientras guarda: el `<fieldset>` apagado vacía `FormData` y la medida diría «sin cambios» a mitad del guardado.
  pausado: boolean
}

// Los campos de texto sin estado: se comparan con lo que mandó el servidor (`defaultValue`). El color tiene estado (React sincroniza su
// `value` con el atributo y `valoresGuardadosDe` lo daría por guardado): se compara con lo guardado.
const TEXTOS = CAMPOS_DE_AJUSTES.filter((campo) => campo !== 'colorAcento')

function textosCambiaron(formulario: HTMLFormElement, colorGuardado: string): boolean {
  return (
    JSON.stringify(valoresDe(formulario, TEXTOS)) !==
      JSON.stringify(valoresGuardadosDe(formulario, TEXTOS)) ||
    valoresDe(formulario, ['colorAcento']).colorAcento !== colorGuardado
  )
}

// Si el formulario de la empresa tiene algo sin guardar: un texto, el color, un logo o un interruptor. Mide en cada `input`, `change` y
// `reset` (el «Descartar» del aviso del borrador hace `form.reset()`), en el cuadro siguiente: un campo con estado se pinta después del
// evento. Mientras guarda no mide; al terminar vuelve a medir (si falló, la barra sigue). Sin `puedeEditar`, nunca hay cambios.
export function useHayCambiosEnAjustes(
  formulario: RefObject<HTMLFormElement | null>,
  { ajustes, logos, interruptores, puedeEditar, pausado }: Opciones,
): boolean {
  const [textos, setTextos] = useState(false)
  const colorGuardado = ajustes.colorAcento ?? ''
  useEffect(() => {
    const elemento = formulario.current
    if (!elemento || !puedeEditar || pausado) {
      return
    }
    let cuadro = 0
    const medir = () => {
      cancelAnimationFrame(cuadro)
      cuadro = requestAnimationFrame(() => {
        setTextos(textosCambiaron(elemento, colorGuardado))
      })
    }
    medir()
    elemento.addEventListener('input', medir)
    elemento.addEventListener('change', medir)
    elemento.addEventListener('reset', medir)
    return () => {
      cancelAnimationFrame(cuadro)
      elemento.removeEventListener('input', medir)
      elemento.removeEventListener('change', medir)
      elemento.removeEventListener('reset', medir)
    }
  }, [formulario, colorGuardado, puedeEditar, pausado])
  if (!puedeEditar) {
    return false
  }
  return (
    textos ||
    logos.claro.tipo !== 'igual' ||
    logos.oscuro.tipo !== 'igual' ||
    interruptores.registroAbierto !== ajustes.registroAbierto ||
    interruptores.limpiezaAutomatica !== ajustes.limpiezaAutomatica
  )
}
