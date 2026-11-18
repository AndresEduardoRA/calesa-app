'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisar, avisarError, avisarExito } from '@/shared/ui/toasts'
import { consultarFicha } from '../../../composicion.client'
import { pideRevisarIntegracion, sePuedeReintentar } from '../../../entities/apibara'
import type { FotoDeSubasta } from '../../../entities/subasta-fotos'
import { respuestaDe } from '../../fotos/envio'
import { refrescarSubasta } from '../actions/refrescar-subasta'
import { RUTA_DE_INTEGRACIONES } from '../ruta'

type Args = {
  vehiculoId: string
  origenId: string
  // Con qué se vuelve a preguntar (enlace, lote o VIN).
  entrada: string
  // La versión del vehículo que tenía en pantalla quien refresca.
  actualizadoEn: string
  // Quien puede ir a Integraciones si la clave o la cuota frenan.
  puedeConfigurar: boolean
}

export function resumenDelRefresco(actualizados: number, conservados: readonly string[]): string {
  const base =
    actualizados > 0 ? 'Subasta actualizada.' : 'Subasta consultada: no había datos nuevos.'
  return conservados.length > 0
    ? `${base} Se conservó lo que editaste: ${conservados.join(', ')}.`
    : base
}

// Cómo terminó un refresco: lo escrito, o el motivo con lo que se puede hacer (reintentar sólo sirve si el fallo es del momento).
export type ResultadoDelRefresco =
  | {
      ok: true
      actualizados: number
      conservados: string[]
      // Las fotos de la respuesta que el vehículo no tiene y si no tiene ninguna: «Actualizar los datos» las trae (el resto lo ignora).
      fotasPorTraer?: FotoDeSubasta[]
      sinFotos?: boolean
    }
  | {
      ok: false
      mensaje: string
      reintentable: boolean
      // La clave o la cuota frenan: quien puede, va a Integraciones.
      revisarIntegracion: boolean
      // Otra persona editó el vehículo mientras tanto: hay que recargar para tener su versión.
      conflicto: boolean
      // El error de la escritura tal cual (con su causa), para el toast; null si falló la consulta a apibara.
      error: ErrorApp | null
    }

// Refrescar la subasta de un vehículo: pregunta a apibara y, con lo que trae, la action decide qué
// se actualiza y qué se conserva. `consultar()` sólo devuelve cómo terminó (lo usa el aviso de la hoja de
// cotizar, que lo dice en su lugar); `refrescar()` además lo avisa con un toast y, si lo frena la
// clave o la cuota, ofrece ir a Integraciones a quien puede.
export function useRefrescoDeSubasta({
  vehiculoId,
  origenId,
  entrada,
  actualizadoEn,
  puedeConfigurar,
}: Args) {
  const router = useRouter()
  const { executeAsync } = useAction(refrescarSubasta)
  const [enCurso, setEnCurso] = useState(false)

  async function consultar(): Promise<ResultadoDelRefresco> {
    const ficha = await consultarFicha(origenId, entrada)
    if (!ficha.ok) {
      const { codigo, mensaje } = ficha.error
      return {
        ok: false,
        mensaje,
        reintentable: sePuedeReintentar(codigo),
        revisarIntegracion: pideRevisarIntegracion(codigo),
        conflicto: false,
        error: null,
      }
    }
    const escrito = await respuestaDe(
      executeAsync({
        vehiculoId,
        actualizadoEnEsperado: actualizadoEn,
        consulta: ficha.data.consulta,
      }),
    )
    if (!escrito.ok) {
      return {
        ok: false,
        mensaje: escrito.error.mensaje,
        reintentable: true,
        revisarIntegracion: false,
        conflicto: escrito.error.codigo === 'conflicto',
        error: escrito.error,
      }
    }
    return { ok: true, ...escrito.data }
  }

  // Un envío a la vez; `null` si ya hay uno en curso.
  async function enUnEnvio(): Promise<ResultadoDelRefresco | null> {
    if (enCurso) {
      return null
    }
    setEnCurso(true)
    try {
      return await consultar()
    } finally {
      setEnCurso(false)
    }
  }

  async function refrescar(): Promise<void> {
    const resultado = await enUnEnvio()
    if (resultado === null) {
      return
    }
    if (resultado.ok) {
      avisarExito(resumenDelRefresco(resultado.actualizados, resultado.conservados))
    } else if (puedeConfigurar && resultado.revisarIntegracion) {
      avisar(resultado.mensaje, {
        etiqueta: 'Ir a Integraciones',
        sale: true,
        alHacer: () => {
          router.push(RUTA_DE_INTEGRACIONES as Route)
        },
      })
    } else {
      avisarError(resultado.error ?? { codigo: 'inesperado', mensaje: resultado.mensaje })
    }
  }

  return { refrescar, consultar: enUnEnvio, enCurso }
}
