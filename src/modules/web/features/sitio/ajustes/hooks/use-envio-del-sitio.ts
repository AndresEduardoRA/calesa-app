'use client'

import { motivosPorCampo } from '@/shared/lib/campos/esquema-de-valor'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import { entradaDeAjustes, type AjustesDelSitio } from '../../../../entities/sitio/ajustes'
import { guardarAjustesDelSitio } from '../actions/guardar-ajustes'
import { esquemaAjustesDelSitio, type EntradaDeAjustesDelSitio } from '../schemas/ajustes'

type Opciones = {
  // Lo guardado al abrir el modal, con su versión: llega por props y nunca va en la `key`.
  ajustes: AjustesDelSitio
  abierto: boolean
  alCerrar: () => void
  // Lo que cambia la tarjeta sobre lo guardado (el resto viaja como está: la base reemplaza `redes` y `seo` enteras).
  cambios: Partial<Omit<EntradaDeAjustesDelSitio, 'actualizadoEnEsperado' | 'origenesVisibles'>> & {
    origenesVisibles?: readonly string[]
  }
  hayCambios: boolean
}

// El guardado de una tarjeta de «Ajustes» del sitio: la versión de la fila va con lo escrito; un `PT409` deja el aviso con «Recargar». Sin cambios,
// guardar cierra. Un rechazo de la base con la clave `redes` o `seo` (`porCampo`) lo dice el modal de su tarjeta junto a sus campos.
export function useEnvioDelSitio({ ajustes, abierto, alCerrar, cambios, hayCambios }: Opciones) {
  const entrada: EntradaDeAjustesDelSitio = {
    ...entradaDeAjustes(ajustes),
    ...cambios,
    origenesVisibles: [...(cambios.origenesVisibles ?? ajustes.origenesVisibles)],
    actualizadoEnEsperado: ajustes.actualizadoEn,
  }
  return useEnvioConVersion({
    abierto,
    hayCambios,
    version: ajustes.actualizadoEn,
    validar: () => {
      if (!hayCambios) {
        return null
      }
      const leido = esquemaAjustesDelSitio.safeParse(entrada)
      return leido.success ? null : motivosPorCampo(leido.error.issues)
    },
    pedir: async () =>
      hayCambios
        ? enviarAccion(guardarAjustesDelSitio(entrada), 'No se pudieron guardar los ajustes.')
        : { ok: true, data: { actualizadoEn: ajustes.actualizadoEn } },
    alGuardar: () => {
      avisarExito('Ajustes del sitio guardados')
      alCerrar()
    },
  })
}
