'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useReducer, useState, useTransition } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { MENSAJE_SIN_CONEXION, type ErrorApp } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { ColumnaDeTabla } from '../../../entities/tabla-de-ayuda'
import {
  columnasParaEnviar,
  edicionDeLasColumnas,
  editarColumnas,
  hayCambios as hayCambiosEn,
  resumenDeLosCambios,
  type AccionDeColumnas,
} from '../../../entities/tablas/edicion-de-columnas'
import { validarColumnas } from '../../../entities/tablas/validacion-de-columnas'
import { cambiarColumnas } from '../actions/cambiar-columnas'

type Opciones = {
  tabla: { id: string; nombre: string; columnas: readonly ColumnaDeTabla[]; version: number }
  // El origen de la pestaña (nulo en Catálogos): el permiso que pide la action; la base pide además el de cada origen que la usa.
  origenId: string | null
  alCerrar: () => void
}

const MENSAJE_DE_VALIDACION = 'Revisa las columnas.'

type Rechazo = { conflicto?: string; porCampo?: Record<string, string>; arriba?: string }

// Dónde va lo que la base rechazó: el PT409 al conflicto, un 22023 de una columna junto a ella, la regla (23503, `version`) y el permiso arriba; lo demás, un aviso.
function rechazoDeColumnas({
  error,
  porCampo,
}: {
  error: ErrorApp
  porCampo?: Record<string, string>
}): Rechazo {
  if (error.codigo === 'conflicto') return { conflicto: error.mensaje }
  if (porCampo && Object.keys(porCampo).some((campo) => campo.startsWith('columnas')))
    return { porCampo }
  if (error.codigo === 'regla' || error.codigo === 'sin_permiso') return { arriba: error.mensaje }
  return {}
}

// «Columnas de <nombre>» (`?tabla=<id>&panel=columnas-de-tabla`): parte de las columnas de la versión abierta y manda la lista entera con esa versión. El PT409 es
// un conflicto con «Recargar» (lo escrito no vuelve); la columna en uso (23503) y el permiso de otro origen (42501) van arriba con el texto de la base, sin
// tocar lo marcado; un 22023 vuelve junto a su campo. Al entrar se cierra: la ruta revalidada remonta el editor con la versión nueva.
export function useColumnasDeTabla({ tabla, origenId, alCerrar }: Opciones) {
  const router = useRouter()
  const [edicion, editar] = useReducer(editarColumnas, tabla.columnas, edicionDeLasColumnas)
  const [porCampo, setPorCampo] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(String(tabla.version))
  const [recargando, recargarPagina] = useTransition()
  const cambiar = useAction(cambiarColumnas)
  const envio = useUnEnvioALaVez()

  const columnas = columnasParaEnviar(edicion)
  const hayCambios = hayCambiosEn(edicion, tabla.columnas)

  async function enviar(): Promise<boolean> {
    if (!hayCambios || conflicto !== null) return false
    const local = validarColumnas(columnas, tabla.columnas)
    if (local) {
      setPorCampo({ [local.camino]: local.mensaje })
      setError(null)
      return false
    }
    const hecho = await envio.mandar(() =>
      enviarAccion(
        cambiar.executeAsync({
          tablaId: tabla.id,
          origenId,
          columnas,
          versionEsperada: tabla.version,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    )
    if (hecho === null) return false
    if (hecho.ok) {
      setPorCampo({})
      setError(null)
      alCerrar()
      avisarExito(`Guardaste las columnas de «${tabla.nombre}».`)
      return true
    }
    if ('sinRed' in hecho) {
      setError(MENSAJE_SIN_CONEXION)
      return false
    }
    const rechazo = rechazoDeColumnas(hecho)
    if (rechazo.conflicto) setConflicto(rechazo.conflicto)
    else if (rechazo.porCampo) {
      setPorCampo(rechazo.porCampo)
      setError(null)
    } else if (rechazo.arriba) {
      setPorCampo({})
      setError(rechazo.arriba)
    } else avisarError(hecho.error)
    return false
  }

  return {
    edicion,
    editar: (accion: AccionDeColumnas) => {
      editar(accion)
      setPorCampo({})
    },
    porCampo,
    error,
    conflicto,
    recargando,
    enCurso: envio.enCurso,
    hayCambios,
    seQuitaAlguna: edicion.columnas.some((c) => c.seQuita),
    resumen: resumenDeLosCambios(edicion, tabla.columnas),
    enviar,
    recargar: () => {
      recargarPagina(() => {
        alCerrar()
        router.refresh()
      })
    },
  }
}
