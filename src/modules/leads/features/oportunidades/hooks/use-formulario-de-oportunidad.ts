'use client'

import { useRegional } from '@/shared/ui/regional'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import type { AccionesDeUnAviso } from '@/shared/lib/acciones-del-aviso'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  cambiosDeOportunidad,
  datosDeOportunidad,
  validarOportunidad,
  valoresDeOportunidad,
  type Oportunidad,
  type ValoresDeOportunidad,
} from '../../../entities/oportunidad'
import { accionesDelRechazo } from '../../../entities/oportunidad-unica'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearOportunidad } from '../actions/crear-oportunidad'
import { guardarOportunidad } from '../actions/guardar-oportunidad'

// Los campos que pueden traer un motivo (el `hint` de la base es la clave del formulario).
const CAMPOS = ['titulo', 'monto_estimado', 'notas', 'vehiculo', 'embudo'] as const
type CampoConError = (typeof CAMPOS)[number]
export type ErroresDelFormulario = Partial<Record<CampoConError, string>>

function erroresDesde(porCampo: Record<string, string>): ErroresDelFormulario {
  return Object.fromEntries(
    CAMPOS.flatMap((campo) => (porCampo[campo] ? [[campo, porCampo[campo]]] : [])),
  )
}

// Al crear, otro embudo que el inicial o algo escrito; al editar, lo que cambió.
function hayCambiosEn(
  oportunidad: Oportunidad | null,
  valores: ValoresDeOportunidad,
  locale: string,
  otroEmbudo: boolean,
): boolean {
  return oportunidad === null
    ? otroEmbudo || JSON.stringify(valores) !== JSON.stringify(valoresDeOportunidad(null, locale))
    : Object.keys(cambiosDeOportunidad(oportunidad, valores, locale)).length > 0
}

type Opciones = {
  leadId: string
  // Al editar, la que se edita; al crear, null.
  oportunidad: Oportunidad | null
  // Con lo que guardó la base (la crea o la edita): la sección la pone en su lugar.
  alGuardar: (oportunidad: Oportunidad) => void
  alTerminar: () => void
  // Al crear, el embudo con el que arranca (`embudosParaCrear().inicial`; `''` es el de por defecto).
  embudoInicial?: string
}

// El formulario de una oportunidad: crear (con el id del intento, que vive mientras el panel está
// abierto, así un reintento no crea dos) o editar (sólo lo que cambió, con la versión). Lo tipeado no se
// pierde: un rechazo deja los valores y dice el motivo junto a su campo; un conflicto ofrece «Recargar». Un rechazo de «una abierta por
// lead y embudo» (otra pestaña la creó en el medio) suma «Abrir esa» (`abierta`) junto al error del embudo.
export function useFormularioDeOportunidad(opciones: Opciones) {
  const { leadId, oportunidad, alGuardar, alTerminar, embudoInicial = '' } = opciones
  const [intento] = useState(() => crypto.randomUUID())
  const { locale } = useRegional()
  const [valores, setValores] = useState(() => valoresDeOportunidad(oportunidad, locale))
  const [embudo, setEmbudo] = useState(embudoInicial)
  const [errores, setErrores] = useState<ErroresDelFormulario>({})
  const [abierta, setAbierta] = useState<AccionesDeUnAviso | null>(null)
  const [conflicto, setConflicto] = useState<string | null>(null)
  const crear = useAction(crearOportunidad)
  const guardar = useAction(guardarOportunidad)

  function rechazo(error: ErrorApp, porCampo?: Record<string, string>) {
    if (error.codigo === 'conflicto') {
      setConflicto(error.mensaje)
    } else if (porCampo) {
      setErrores(erroresDesde(porCampo))
    } else {
      avisarError(error)
    }
  }

  async function enviar() {
    const locales = validarOportunidad(valores, locale)
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }
    const envio = oportunidad
      ? await enviarAccion(
          guardar.executeAsync({
            id: oportunidad.id,
            actualizadoEnEsperado: oportunidad.actualizadoEn,
            cambios: cambiosDeOportunidad(oportunidad, valores, locale),
          }),
          MENSAJE_DE_VALIDACION,
        )
      : await enviarAccion(
          crear.executeAsync({
            id: intento,
            leadId,
            datos: {
              ...datosDeOportunidad(valores, locale),
              ...(embudo ? { embudo_id: embudo } : {}),
            },
          }),
          MENSAJE_DE_VALIDACION,
        )
    if (!envio.ok) {
      setAbierta(accionesDelRechazo(leadId, envio).acciones ?? null)
      rechazo(envio.error, 'porCampo' in envio ? envio.porCampo : undefined)
      return
    }
    avisarExito(oportunidad ? 'Oportunidad guardada.' : 'Oportunidad creada.')
    alGuardar(envio.data.oportunidad)
    alTerminar()
  }

  return {
    valores,
    cambiar: (campo: keyof ValoresDeOportunidad, valor: string) => {
      setValores((v) => ({ ...v, [campo]: valor }))
      const conError: CampoConError = campo === 'monto' ? 'monto_estimado' : campo
      setErrores((e) => ({ ...e, [conError]: undefined }))
    },
    embudo,
    setEmbudo: (valor: string) => {
      setEmbudo(valor)
      setErrores((e) => ({ ...e, embudo: undefined }))
      setAbierta(null)
    },
    abierta,
    // Al editar sin cambios no hay nada que mandar.
    sinCambios: oportunidad !== null && !hayCambiosEn(oportunidad, valores, locale, false),
    // Algo escrito que todavía no se guardó (un aviso que sale de la pantalla pregunta antes de irse).
    hayCambios: hayCambiosEn(oportunidad, valores, locale, embudo !== embudoInicial),
    errores,
    conflicto,
    enCurso: crear.isPending || guardar.isPending,
    enviar,
    recargar: () => {
      window.location.reload()
    },
  }
}
