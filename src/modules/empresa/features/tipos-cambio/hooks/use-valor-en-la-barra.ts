'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { MENSAJE_SIN_RESPUESTA } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { VALOR_INVALIDO, valorTipeado } from '../../../entities/tipos-cambio'
import {
  conflictoDeValor,
  type ConflictoDeValor,
  type TipoCambioVigente,
} from '../../../entities/tipos-cambio-vigentes'
import { guardarTipoCambio } from '../actions/guardar-tipo-cambio'

type Args = {
  // El tipo de cambio como estaba al abrir el editor: su versión es la esperada, aunque la lista se relea debajo.
  base: TipoCambioVigente
  // Relee la lista del popover y devuelve lo leído (null si no se pudo).
  releer: () => Promise<TipoCambioVigente[] | null>
  // Guardado, sin cambios o cancelado: el editor se cierra.
  alCerrar: () => void
}

// Lo que se dice tras un PT409: lo que se releyó (quién, a cuánto y cuándo) o, si releer falló, el texto de la base.
export type ConflictoDelEditor = { de: ConflictoDeValor | null; mensaje: string }

// Cambiar el valor desde el popover de la barra con la misma action que Configuración y el ⚙ de la hoja (`{id, actualizadoEnEsperado,
// valor}`, nada más). Guardado: el aviso de siempre, la lista se relee y el editor se cierra (la barra se pone al día por la revalidación
// del layout). Un conflicto relee y dice quién lo cambió y a cuánto. Sin red, lo tipeado queda y sale solo, una vez, al volver la conexión.
export function useValorEnLaBarra({ base, releer, alCerrar }: Args) {
  const accion = useAction(guardarTipoCambio)
  const [pendiente, setPendiente] = useState<number | null>(null)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [conflicto, setConflicto] = useState<ConflictoDelEditor | null>(null)

  async function enviar(valor: number): Promise<boolean> {
    setMotivo(null)
    const envio = await enviarAccion(
      accion.executeAsync({ id: base.id, actualizadoEnEsperado: base.actualizadoEn, valor }),
      VALOR_INVALIDO,
    )
    if (envio.ok) {
      setPendiente(null)
      avisarExito(`Tipo de cambio «${base.nombre}» guardado`)
      await releer()
      alCerrar()
      return true
    }
    if ('sinRed' in envio) {
      // Sin conexión sale solo al volver; con conexión, el servidor no contestó: se dice y se vuelve a guardar a mano.
      if (navigator.onLine) {
        setPendiente(null)
        setMotivo(MENSAJE_SIN_RESPUESTA)
      } else {
        setPendiente(valor)
      }
      return false
    }
    setPendiente(null)
    const { error } = envio
    if (error.codigo === 'conflicto') {
      const frescos = await releer()
      setConflicto({
        de: frescos ? conflictoDeValor({ id: base.id, valor: base.valor }, frescos) : null,
        mensaje: error.mensaje,
      })
    } else if (
      error.codigo === 'validacion' ||
      error.codigo === 'regla' ||
      error.codigo === 'sin_permiso'
    ) {
      setMotivo(error.mensaje)
    } else {
      avisarError(error)
    }
    return false
  }

  const enLinea = useReintentoAlVolver(pendiente, enviar)

  return {
    // Lo tipeado, con el lector de toda la app y el locale de la empresa: lo que no se lee se dice junto al campo y no se envía; el mismo
    // valor no se guarda (cierra).
    guardar: (texto: string, locale: string) => {
      const leido = valorTipeado(texto, locale)
      if (!leido.ok) {
        setMotivo(leido.motivo)
      } else if (leido.valor === base.valor) {
        alCerrar()
      } else {
        void enviar(leido.valor)
      }
    },
    // Cancelar suelta lo que esperaba la red.
    cancelar: () => {
      setPendiente(null)
      alCerrar()
    },
    // Lo que no se guardó y por qué (lo dice junto al campo), o null.
    motivo,
    decir: setMotivo,
    conflicto,
    enCurso: accion.isPending,
    // Esperando la red con algo escrito: el campo queda de sólo lectura y «Cancelar» lo suelta.
    sinRed: pendiente !== null && !enLinea,
    pendiente: pendiente !== null,
  }
}
