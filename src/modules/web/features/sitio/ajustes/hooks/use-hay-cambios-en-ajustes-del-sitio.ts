'use client'

import { useEffect, useState, type RefObject } from 'react'
import { valoresDe, valoresGuardadosDe } from '@/shared/lib/formularios'
import { CAMPOS_DE_AJUSTES_DEL_SITIO } from './use-guardar-ajustes-del-sitio'

type Opciones = {
  // Lo que cambia sin ser un campo de texto: la moneda secundaria y los orígenes tildados, contra lo guardado.
  moneda: { guardada: boolean; actual: boolean }
  origenes: { guardados: readonly string[]; tildados: readonly string[] }
  // Mientras guarda: el `<fieldset>` apagado vacía `FormData` y la medida diría «sin cambios» a mitad del guardado.
  pausado: boolean
}

function mismosOrigenes(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id))
}

// Si el formulario de «Ajustes» tiene algo sin guardar: un texto (contra lo que mandó el servidor, el `defaultValue`), la moneda secundaria o un
// origen tildado. Mide en cada `input`, `change` y `reset` (el «Descartar» del aviso del borrador hace `form.reset()`) y al enganchar: lo que el
// borrador repuso también cuenta. Mientras guarda no mide; al terminar vuelve a medir (si falló, la barra sigue).
export function useHayCambiosEnAjustesDelSitio(
  formulario: RefObject<HTMLFormElement | null>,
  { moneda, origenes, pausado }: Opciones,
): boolean {
  const [textos, setTextos] = useState(false)
  useEffect(() => {
    const elemento = formulario.current
    if (!elemento || pausado) {
      return
    }
    const nombres = [...CAMPOS_DE_AJUSTES_DEL_SITIO]
    const medir = () => {
      setTextos(
        JSON.stringify(valoresDe(elemento, nombres)) !==
          JSON.stringify(valoresGuardadosDe(elemento, nombres)),
      )
    }
    medir()
    elemento.addEventListener('input', medir)
    elemento.addEventListener('change', medir)
    elemento.addEventListener('reset', medir)
    return () => {
      elemento.removeEventListener('input', medir)
      elemento.removeEventListener('change', medir)
      elemento.removeEventListener('reset', medir)
    }
  }, [formulario, pausado])
  return (
    textos ||
    moneda.actual !== moneda.guardada ||
    !mismosOrigenes(origenes.guardados, origenes.tildados)
  )
}
