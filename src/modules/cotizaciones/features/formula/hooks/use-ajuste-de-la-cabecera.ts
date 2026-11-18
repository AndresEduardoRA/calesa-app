'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { ofreceVerTotalBs } from '../../../entities/cabecera-de-la-hoja'
import {
  aplicarALaHoja,
  mismosValores,
  MISMOS_VALORES_DE_LA_CABECERA,
  porDefectoDe,
  type PorDefecto,
} from '../../../entities/cabecera-por-defecto'
import type { PropsDelAjusteDeLaCabecera } from '../../hoja/components/huecos'
import { cambiarCabecera } from '../actions/cambiar-cabecera'
import { useCabeceraPorDefecto } from './use-cabecera-por-defecto'

const MENSAJE_DE_VALIDACION = 'No pudimos leer el pedido. Recarga y vuelve a intentar.'
export const MENSAJE_SIN_CONEXION = 'No hay conexión.'

// Lo que el panel dice tras un envío: el mensaje (el de la base tal cual, salvo sin red) y su salida: «Volver a leer» si lo leído ya no vale (PT409), «Reintentar» si no
// se supo; un rechazo de regla (los mismos valores) no tiene salida.
export type AvisoDeLaCabecera = { mensaje: string; salida: 'volver_a_leer' | 'reintentar' | null }

function avisoDe(envio: Exclude<Envio<string>, { ok: true }>): AvisoDeLaCabecera {
  if ('sinRed' in envio) {
    return { mensaje: MENSAJE_SIN_CONEXION, salida: 'reintentar' }
  }
  const { codigo, mensaje } = envio.error
  return {
    mensaje,
    salida: codigo === 'conflicto' ? 'volver_a_leer' : codigo === 'regla' ? null : 'reintentar',
  }
}

type Args = Omit<PropsDelAjusteDeLaCabecera, 'abierto'> & { origenId: string }
type HojaDelAjuste = PropsDelAjusteDeLaCabecera['hoja']

// Pone en la hoja abierta lo elegido, como si la persona lo eligiera: el modo (si cambia) y «Ver total» (si la hoja lo ofrece y cambia).
function aplicarEnLaHoja(hoja: HojaDelAjuste, valor: PorDefecto) {
  if (valor.modo !== hoja.modoElegido) {
    hoja.alElegirModo(valor.modo)
  }
  if (ofreceVerTotalBs(hoja.cabecera) && valor.verTotalBs !== hoja.verTotalBs) {
    hoja.alCambiarVerTotalBs(valor.verTotalBs)
  }
}

const exito = (origen: string, aplicada: boolean) =>
  aplicada
    ? `Guardaste la configuración por defecto de ${origen} y la aplicaste a esta cotización.`
    : `Guardaste la configuración por defecto de ${origen}. Esta cotización no cambia.`

// Lo elegido: nace con lo leído la primera vez y ninguna lectura nueva lo pisa.
function useElegido(leido: PorDefecto | null) {
  const [elegido, setElegido] = useState<PorDefecto | null>(null)
  if (leido !== null && elegido === null) {
    setElegido(leido)
  }
  return [elegido ?? leido, setElegido] as const
}

// El ⚙ de la cabecera: lee la cabecera de la publicada, abre el formulario con lo efectivo y publica la N+1 con `cambiarCabecera` (la esperada es **la publicada que se
// leyó**). Un envío a la vez. «Aplicar también a esta cotización» nace marcada y, tras la respuesta buena y si se puede, pone en la hoja el modo y «Ver total» como si la
// persona los eligiera (queda como cambio sin guardar). Lo elegido no lo pisa ninguna lectura nueva.
export function useAjusteDeLaCabecera({ origenId, origen, cerrar, hoja }: Args) {
  const lectura = useCabeceraPorDefecto(origenId)
  const accion = useAction(cambiarCabecera)
  const { mandar, enCurso } = useUnEnvioALaVez()
  const [aplicar, setAplicar] = useState(true)
  const [aviso, setAviso] = useState<AvisoDeLaCabecera | null>(null)
  const { estado } = lectura
  const leido = estado.tipo === 'listo' ? porDefectoDe(estado) : null
  const [valor, setElegido] = useElegido(leido)
  const aplicable =
    valor === null
      ? null
      : aplicarALaHoja({
          modosDeLaHoja: hoja.cabecera.modos,
          version: hoja.formula.version,
          soloLectura: hoja.soloLectura,
          modo: valor.modo,
        })

  async function enviar(): Promise<void> {
    const bloqueado = aviso?.salida === 'volver_a_leer'
    if (estado.tipo !== 'listo' || valor === null || leido === null || bloqueado) {
      return
    }
    if (mismosValores(valor, leido)) {
      setAviso({ mensaje: MISMOS_VALORES_DE_LA_CABECERA, salida: null })
      return
    }
    setAviso(null)
    const envio = await mandar(() =>
      enviarAccion(
        accion.executeAsync({
          origenId,
          modoPorDefecto: valor.modo,
          verTotalBsPorDefecto: valor.verTotalBs,
          modosVisibles: [...valor.visibles],
          publicadaEsperada: estado.publicadaId,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    )
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      setAviso(avisoDe(envio))
      return
    }
    const aplicada = aplicar && aplicable?.puede === true
    if (aplicada) {
      aplicarEnLaHoja(hoja, valor)
    }
    avisarExito(exito(origen, aplicada))
    cerrar()
  }

  return {
    lectura: estado,
    reintentarLectura: lectura.releer,
    valor,
    elegir: (nuevo: PorDefecto) => {
      setElegido(nuevo)
      setAviso((antes) => (antes?.salida === 'volver_a_leer' ? antes : null))
    },
    aplicar,
    marcarAplicar: setAplicar,
    aplicable,
    enviar,
    enCurso,
    aviso,
    // La publicada nueva llega con la lectura; lo elegido queda.
    volverALeer: () => {
      setAviso(null)
      lectura.releer()
    },
    hayCambios: valor !== null && leido !== null && !mismosValores(valor, leido),
  }
}

export type AjusteDeLaCabecera = ReturnType<typeof useAjusteDeLaCabecera>
