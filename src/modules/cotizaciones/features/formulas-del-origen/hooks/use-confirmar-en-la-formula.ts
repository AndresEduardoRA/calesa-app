'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import type { Envio } from '@/shared/lib/enviar-accion'
import { rutaDeLasFormulas } from '@/shared/lib/rutas'
import { avisarError, avisarExito, type OpcionesDeError } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { useCerrarYReleer } from './use-cerrar-y-releer'

type Args = {
  origenId: string
  alCerrar: () => void
  volverALaLista: boolean
  // El pedido: la action con la versión que se leyó, sobre `enviarAccion()`.
  pedir: () => Promise<Envio<unknown>>
  // «Archivaste «Flete».»
  hecho: string
  // Las acciones del aviso de un rechazo (la salida de una fórmula en uso).
  accionesDelRechazo?: (error: ErrorApp) => OpcionesDeError
}

// Lo de un `<Confirmar>` sobre una fórmula del origen (archivar, eliminar): un envío a la vez; al entrar avisa y vuelve a leer la lista (o vuelve a ella desde el
// editor); el PT409 queda en el diálogo con «Recargar»; sin conexión lo dice y queda abierto; otro rechazo cierra y avisa.
export function useConfirmarEnLaFormula({
  origenId,
  alCerrar,
  volverALaLista,
  pedir,
  hecho: textoDeHecho,
  accionesDelRechazo,
}: Args) {
  const router = useRouter()
  const cerrarYReleer = useCerrarYReleer()
  const { mandar, enCurso } = useUnEnvioALaVez()
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [sinRed, setSinRed] = useState(false)
  // Entró: mientras se va, otro clic reenviaría sobre algo que ya cambió.
  const [listo, setListo] = useState(false)
  const [recargando, recargarPagina] = useTransition()

  async function confirmar() {
    if (listo) return
    const hecho = await mandar(pedir)
    if (hecho === null) return
    setSinRed(false)
    if (hecho.ok) {
      setListo(true)
      avisarExito(textoDeHecho)
      if (volverALaLista) {
        router.replace(rutaDeLasFormulas(origenId))
        return
      }
      cerrarYReleer()
      return
    }
    if ('sinRed' in hecho) {
      setSinRed(true)
      return
    }
    if (hecho.error.codigo === 'conflicto') {
      setConflicto(hecho.error.mensaje)
      return
    }
    alCerrar()
    avisarError(hecho.error, accionesDelRechazo?.(hecho.error) ?? {})
  }

  return {
    confirmar,
    enCurso: enCurso || listo,
    conflicto,
    sinRed,
    recargando,
    recargar: () => {
      recargarPagina(() => {
        cerrarYReleer()
      })
    },
  }
}
