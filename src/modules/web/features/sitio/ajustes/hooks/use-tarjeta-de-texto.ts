'use client'

import { useState } from 'react'
import { entradaDeAjustes, type AjustesDelSitio } from '../../../../entities/sitio/ajustes'
import {
  escritoInicial,
  hayCambiosDeTexto,
  type CampoDeTexto,
  type TarjetaDeTexto,
} from '../../../../entities/sitio/tarjetas-del-sitio'
import { useEnvioDelSitio } from './use-envio-del-sitio'

type Opciones = {
  tarjeta: TarjetaDeTexto
  ajustes: AjustesDelSitio
  abierto: boolean
  alCerrar: () => void
}

// Una tarjeta de texto de «Ajustes» (identidad, contacto, redes, SEO) en su modal: lo escrito parte de lo guardado, cambiar un campo quita su motivo y el
// guardado va por `useEnvioDelSitio`.
export function useTarjetaDeTexto({ tarjeta, ajustes, abierto, alCerrar }: Opciones) {
  const guardado = entradaDeAjustes(ajustes)
  const [escrito, setEscrito] = useState(() => escritoInicial(tarjeta, guardado))
  const formulario = useEnvioDelSitio({
    ajustes,
    abierto,
    alCerrar,
    cambios: escrito,
    hayCambios: hayCambiosDeTexto(tarjeta, guardado, escrito),
  })
  return {
    formulario,
    escrito,
    cambiar: (campo: CampoDeTexto, valor: string) => {
      setEscrito((antes) => ({ ...antes, [campo]: valor }))
      formulario.quitarMotivo(campo)
    },
  }
}

export type TarjetaDeTextoEnModal = ReturnType<typeof useTarjetaDeTexto>
