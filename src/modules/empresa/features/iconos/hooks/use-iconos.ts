'use client'

import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { ok } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import {
  descartarIconos,
  dibujarIconos,
  subirIconos,
  type IconoDibujado,
} from '../../../composicion.client'
import { colorDeFondo, type FondoDeIcono, type Iconos } from '../../../entities/iconos'
import { guardarIconos } from '../actions/guardar-iconos'
import { guardarIconosRegenerados } from '../regenerar-iconos'

type Guardado = Envio<{ actualizadoEn: string }>

const NO_SE_GUARDO = 'No se pudieron guardar los íconos.'

// Sube los íconos nuevos (o ninguno: volver a los neutros), guarda sus rutas y descarta los de antes (`guardarIconosRegenerados()`).
// Devuelve lo que respondió la action tal cual (con su `sinRed` o su conflicto): el commit diferido sólo lleva el resultado.
async function guardarLosIconos(
  nuevos: IconoDibujado[] | null,
  anteriores: Iconos | null,
  actualizadoEnEsperado: string,
): Promise<Guardado> {
  const visto: { respuesta: Guardado | null } = { respuesta: null }
  const resultado = await guardarIconosRegenerados(
    {
      subir: subirIconos,
      descartar: descartarIconos,
      guardar: async (rutas) => {
        const respuesta = await enviarAccion(
          guardarIconos({ iconos: rutas, actualizadoEnEsperado }),
          NO_SE_GUARDO,
        )
        visto.respuesta = respuesta
        return respuesta.ok ? ok(respuesta.data) : { ok: false, error: respuesta.error }
      },
    },
    { dibujados: nuevos, anteriores },
  )
  if (resultado.ok) {
    return { ok: true, data: resultado.data }
  }
  if (visto.respuesta !== null) {
    return visto.respuesta
  }
  // La subida falló antes de guardar: sin conexión se espera; si no, se dice.
  return typeof navigator !== 'undefined' && !navigator.onLine
    ? { ok: false, sinRed: true, error: resultado.error }
    : { ok: false, error: resultado.error }
}

type Opciones = {
  // URL pública del logo guardado, o null si la empresa no cargó uno.
  logoUrl: string | null
  colorAcento: string | null
  // Los íconos guardados hoy, o null si valen los neutros.
  iconos: Iconos | null
  actualizadoEn: string
}

// «Regenerar íconos» en su modal: se dibujan en el navegador y quedan a la vista; recién al guardar se suben y se guardan (commit
// diferido). Si algo falla, no queda nada a medias y lo dibujado sigue ahí.
export function useIconos(opciones: Opciones & { abierto: boolean; alCerrar: () => void }) {
  const { logoUrl, colorAcento, iconos, actualizadoEn, abierto, alCerrar } = opciones
  const [dibujados, setDibujados] = useState<IconoDibujado[] | null>(null)
  const [dibujando, setDibujando] = useState(false)

  async function dibujar(fondo: FondoDeIcono): Promise<void> {
    if (!logoUrl) {
      return
    }
    setDibujando(true)
    const resultado = await dibujarIconos(logoUrl, colorDeFondo(fondo, colorAcento))
    setDibujando(false)
    if (resultado.ok) {
      setDibujados(resultado.data)
    } else {
      avisarError(resultado.error)
    }
  }

  const formulario = useEnvioConVersion({
    abierto,
    hayCambios: dibujados !== null,
    version: actualizadoEn,
    validar: () => null,
    pedir: () =>
      dibujados
        ? guardarLosIconos(dibujados, iconos, actualizadoEn)
        : Promise.resolve({ ok: true, data: { actualizadoEn } }),
    alGuardar: () => {
      avisarExito('Íconos de la app guardados')
      alCerrar()
    },
  })

  return {
    formulario: { ...formulario, sinPoderEnviar: dibujados === null || dibujando },
    // Lo dibujado y todavía sin guardar.
    dibujados,
    dibujar,
    dibujando,
  }
}

// «Volver a los íconos neutros», desde el «⋯» de la tarjeta: guarda al instante, con su toast.
export function useVolverALosNeutros({
  iconos,
  actualizadoEn,
}: Pick<Opciones, 'iconos' | 'actualizadoEn'>) {
  const [enCurso, setEnCurso] = useState(false)
  async function volver(): Promise<void> {
    setEnCurso(true)
    const envio = await guardarLosIconos(null, iconos, actualizadoEn)
    setEnCurso(false)
    if (envio.ok) {
      avisarExito('La app vuelve a usar los íconos neutros')
    } else {
      avisarError(envio.error)
    }
  }
  return { volver, enCurso }
}
