'use client'

import { useState } from 'react'
import { motivosPorCampo } from '@/shared/lib/campos/esquema-de-valor'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import { descartarAvatar, subirAvatar } from '../../../composicion.client'
import { guardarPerfil } from '../actions/guardar-perfil'
import { esquemaPerfil } from '../schemas/perfil'

// Qué hacer con la foto al guardar. Elegir un archivo no sube nada: se sube al confirmar.
export type CambioDeFoto = { tipo: 'igual' } | { tipo: 'nueva'; archivo: File } | { tipo: 'quitar' }

type Subida = { ruta: string; miniatura: string }

type Opciones = {
  usuarioId: string
  // Lo guardado al abrir el modal, con su versión: llega por props y nunca va en la `key`.
  avatarRuta: string | null
  nombreGuardado: string
  actualizadoEn: string
  abierto: boolean
  alCerrar: () => void
}

// La fila no se guardó: la foto recién subida (y su miniatura) no quedó en ningún perfil.
function descartarSubida(nueva: Subida | null | undefined): void {
  if (nueva) {
    void descartarAvatar(nueva.ruta)
    void descartarAvatar(nueva.miniatura)
  }
}

// La foto que había, si se cambió o se quitó. Su miniatura no: la encola un trigger y la borra storage-gc (cierre 1).
function descartarAnterior(anterior: string | null, nueva: string | null | undefined): void {
  if (nueva !== undefined && anterior && anterior !== nueva) {
    void descartarAvatar(anterior)
  }
}

// El guardado del modal «Tú» (nombre y foto): lo de `useEnvioConVersion` más la subida de la foto, que va justo antes de la fila. Un rechazo o un conflicto
// descartan lo subido; un corte de red lo deja (la subida es por hash: reintentar sube lo mismo).
export function useEnvioDelPerfil({
  usuarioId,
  avatarRuta,
  nombreGuardado,
  actualizadoEn,
  abierto,
  alCerrar,
}: Opciones) {
  const [nombre, setNombre] = useState(nombreGuardado)
  const [foto, setFoto] = useState<CambioDeFoto>({ tipo: 'igual' })
  const hayCambios = nombre.trim() !== nombreGuardado || foto.tipo !== 'igual'

  async function subir(): Promise<Subida | null | undefined | Envio<never>> {
    if (foto.tipo === 'igual') {
      return undefined
    }
    if (foto.tipo === 'quitar') {
      return null
    }
    const subida = await subirAvatar(usuarioId, foto.archivo)
    return subida.ok ? subida.data : { ok: false, error: subida.error }
  }

  const formulario = useEnvioConVersion({
    abierto,
    hayCambios,
    version: actualizadoEn,
    validar: () => {
      if (!hayCambios) {
        return null
      }
      const leido = esquemaPerfil.safeParse({ nombre, actualizadoEnEsperado: actualizadoEn })
      return leido.success ? null : motivosPorCampo(leido.error.issues)
    },
    pedir: async () => {
      if (!hayCambios) {
        return { ok: true, data: { actualizadoEn } }
      }
      const subida = await subir()
      if (subida !== undefined && subida !== null && 'ok' in subida) {
        return subida
      }
      const nuevaRuta = subida === undefined ? undefined : (subida?.ruta ?? null)
      const envio = await enviarAccion(
        guardarPerfil({
          nombre,
          avatarRuta: nuevaRuta,
          ...(subida ? { avatarMiniaturaRuta: subida.miniatura } : {}),
          actualizadoEnEsperado: actualizadoEn,
        }),
        'No se pudo guardar tu perfil.',
      )
      if (envio.ok) {
        descartarAnterior(avatarRuta, nuevaRuta)
      } else if (!('sinRed' in envio)) {
        descartarSubida(subida)
      }
      return envio
    },
    alGuardar: () => {
      if (hayCambios) {
        avisarExito('Perfil guardado')
      }
      alCerrar()
    },
  })
  return {
    formulario,
    nombre,
    foto,
    setFoto,
    cambiarNombre: (valor: string) => {
      setNombre(valor)
      formulario.quitarMotivo('nombre')
    },
  }
}
