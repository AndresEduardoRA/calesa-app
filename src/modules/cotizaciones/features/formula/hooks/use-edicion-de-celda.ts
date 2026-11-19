'use client'

import { useEffect, useRef, useState } from 'react'

export type Lectura<T> = { ok: true; valor: T } | { ok: false; aviso: string }
export type Confirmacion = { ok: true } | { ok: false; mensaje: string }

type Args<T> = {
  // El texto con que abre la entrada (el valor con su precisión completa).
  textoInicial: () => string
  // Cómo se lee lo tipeado (el lector de números de la app, con el locale).
  leer: (texto: string) => Lectura<T>
  // Lo leído entra (o no, con su motivo): la celda conserva el valor anterior si no entra.
  alConfirmar: (valor: T) => Confirmacion
  // Una celda que espera (`aria-disabled`) no abre.
  bloqueada: boolean
}

// Una celda editable de la planilla de la fórmula: el botón que muestra el valor y, al abrirla (clic, Enter), la entrada que lo reemplaza. Enter confirma y el foco
// vuelve al botón; salir del campo confirma un número y descarta lo demás; Esc cancela. Lo que no se lee, o no entra, deja la celda con el valor anterior y el motivo
// junto a ella (`aria-invalid`): con Enter la entrada sigue abierta para corregir; al salir, se cierra y el motivo queda.
export function useEdicionDeCelda<T>({ textoInicial, leer, alConfirmar, bloqueada }: Args<T>) {
  const [texto, setTexto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const devolverFoco = useRef(false)
  // La entrada sigue abierta: un `blur` que llega tras cerrarla (Esc la desmonta) no confirma lo de antes.
  const enCurso = useRef(false)
  const abierta = texto !== null && !bloqueada

  useEffect(() => {
    if (texto === null && devolverFoco.current) {
      devolverFoco.current = false
      boton.current?.focus()
    }
  }, [texto])

  const cerrar = (foco: boolean) => {
    enCurso.current = false
    devolverFoco.current = foco
    setTexto(null)
  }

  // `alSalir`: la entrada pierde el foco (no se queda abierta con un error).
  const confirmar = (alSalir: boolean) => {
    if (texto === null || !enCurso.current) return
    const leido = leer(texto)
    const r: Confirmacion = leido.ok
      ? alConfirmar(leido.valor)
      : { ok: false, mensaje: leido.aviso }
    if (r.ok) {
      setError(null)
      cerrar(!alSalir)
      return
    }
    setError(r.mensaje)
    if (alSalir) cerrar(false)
  }

  return {
    abierta,
    texto: texto ?? '',
    error,
    boton,
    abrir: () => {
      if (bloqueada) return
      enCurso.current = true
      setError(null)
      setTexto(textoInicial())
    },
    cambiar: setTexto,
    confirmar,
    cancelar: () => {
      setError(null)
      cerrar(true)
    },
  }
}
