'use client'

import { useState } from 'react'
import type { ZodError } from 'zod'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { ok, type ErrorApp } from '@/shared/lib/errores'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import { descartarLogo, subirLogo, type LogoListo } from '../../../composicion.client'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import {
  borradorDeLaTarjeta,
  cambiosDeLaTarjeta,
  type CampoDeLaTarjeta,
  type Escrito,
  type TarjetaConCampos,
} from '../../../entities/tarjetas-de-la-empresa'
import { guardarAjustes } from '../actions/guardar-ajustes'
import { guardarConLogos, type CambioDeLogo } from '../guardar-con-logo'
import { esquemaDeLaTarjeta } from '../schemas/ajustes'

export type LogoElegido = CambioDeLogo<LogoListo>

// El logo normal y el del tema oscuro: viajan en el mismo guardado, con una sola versión.
export type LogosElegidos = { claro: LogoElegido; oscuro: LogoElegido }

const SIN_LOGOS: LogosElegidos = { claro: { tipo: 'igual' }, oscuro: { tipo: 'igual' } }

const NO_SE_GUARDO = 'No se pudieron guardar los ajustes.'

type Opciones = {
  tarjeta: TarjetaConCampos
  // Lo guardado al abrir el modal, con su versión: llega por props y nunca va en la `key`.
  ajustes: AjustesEmpresa
  // Con datos cargados la moneda base no viaja: el campo está apagado.
  conDatosCargados: boolean
  abierto: boolean
  alCerrar: () => void
  // Los logos que se eligieron (sólo Identidad): se suben recién al guardar.
  logos?: LogosElegidos
}

type Guardado = Envio<{ actualizadoEn: string }>

// Los motivos de un esquema, por su campo (el primero de cada uno).
function motivosPorCampo(error: ZodError): Record<string, string> {
  const motivos: Record<string, string> = {}
  for (const problema of error.issues) {
    const campo = String(problema.path[0] ?? '')
    motivos[campo] ??= problema.message
  }
  return motivos
}

// Un rechazo de la base que es de un campo: la causa es la columna.
function campoDelRechazo(error: ErrorApp): CampoDeLaTarjeta | null {
  if (error.causa === 'telefono_cc') {
    return 'telefonoCc'
  }
  return error.causa === 'limpieza_dias_gracia' ? 'limpiezaDiasGracia' : null
}

// Guarda con los logos nuevos: se suben recién acá y, si la fila no se guarda, se descartan (`guardarConLogos()`). Devuelve lo que
// respondió la action tal cual (con su `sinRed` o sus campos): `guardarConLogos()` sólo lleva el resultado.
async function guardarConLosLogos(
  logos: LogosElegidos,
  ajustes: AjustesEmpresa,
  guardar: (rutas: {
    logoRuta: string | null | undefined
    logoOscuroRuta: string | null | undefined
  }) => Promise<Guardado>,
): Promise<Guardado> {
  const visto: { respuesta: Guardado | null } = { respuesta: null }
  const guardado = await guardarConLogos(
    {
      subir: subirLogo,
      descartar: descartarLogo,
      guardar: async (rutas) => {
        const respuesta = await guardar(rutas)
        visto.respuesta = respuesta
        return respuesta.ok ? ok(respuesta.data) : { ok: false, error: respuesta.error }
      },
    },
    {
      claro: { cambio: logos.claro, rutaGuardada: ajustes.logoRuta },
      oscuro: { cambio: logos.oscuro, rutaGuardada: ajustes.logoOscuroRuta },
    },
  )
  if (guardado.ok) {
    return { ok: true, data: { actualizadoEn: guardado.data.actualizadoEn } }
  }
  if (visto.respuesta !== null) {
    return visto.respuesta
  }
  // La subida del logo falló antes de guardar: sin conexión se espera; si no, se dice.
  return typeof navigator !== 'undefined' && !navigator.onLine
    ? { ok: false, sinRed: true, error: guardado.error }
    : { ok: false, error: guardado.error }
}

// Guardar una tarjeta de Datos: lo escrito se compara con lo guardado y sólo viaja lo que cambió, con la versión de la fila
// (`empresa_guardar_ajustes()` no toca lo ausente). Sin diferencias, guardar cierra. Lo tipeado queda siempre: si algo falla, el motivo
// va junto al campo.
export function useGuardarTarjeta(opciones: Opciones) {
  const { tarjeta, ajustes, conDatosCargados, abierto, alCerrar, logos = SIN_LOGOS } = opciones
  const [escrito, setEscrito] = useState<Escrito>(() => borradorDeLaTarjeta(tarjeta, ajustes))
  const cambios = cambiosDeLaTarjeta(tarjeta, ajustes, escrito, { conDatosCargados })
  const hayLogos = logos.claro.tipo !== 'igual' || logos.oscuro.tipo !== 'igual'

  async function pedir(): Promise<Guardado> {
    if (cambios === null && !hayLogos) {
      return { ok: true, data: { actualizadoEn: ajustes.actualizadoEn } }
    }
    const entrada = { ...cambios, actualizadoEnEsperado: ajustes.actualizadoEn }
    return hayLogos
      ? guardarConLosLogos(logos, ajustes, (rutas) =>
          enviarAccion(guardarAjustes({ ...entrada, ...rutas }), NO_SE_GUARDO),
        )
      : enviarAccion(guardarAjustes(entrada), NO_SE_GUARDO)
  }

  const formulario = useEnvioConVersion({
    abierto,
    hayCambios: cambios !== null || hayLogos,
    version: ajustes.actualizadoEn,
    validar: () => {
      if (cambios === null) {
        return null
      }
      const leido = esquemaDeLaTarjeta(tarjeta).safeParse(cambios)
      return leido.success ? null : motivosPorCampo(leido.error)
    },
    pedir,
    alGuardar: () => {
      avisarExito('Ajustes de la empresa guardados')
      alCerrar()
    },
    campoDelRechazo,
  })

  return {
    ...formulario,
    escrito,
    // Cambiar un campo quita su motivo: se vuelve a revisar al guardar.
    cambiar: (campo: CampoDeLaTarjeta, valor: string | boolean) => {
      setEscrito((antes) => ({ ...antes, [campo]: valor }))
      formulario.quitarMotivo(campo)
    },
  }
}

export type FormularioDeTarjeta = ReturnType<typeof useGuardarTarjeta>
