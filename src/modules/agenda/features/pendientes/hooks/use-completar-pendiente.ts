'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError } from '@/shared/ui/toasts'
import { completarRecordatorio } from '@/modules/leads/client'
import type { PendienteDeAgenda } from '../../../entities/pendientes'
import { completarTarea } from '../../tareas/actions/completar-tarea'

const MENSAJE_DE_VALIDACION = 'No pudimos completarlo. Vuelve a intentar.'

type Version = { ok: true; actualizadoEn: string } | { ok: false }

// Pone hecha o pendiente una tarea o un recordatorio (poner, no alternar) con la versión que se tiene; un error se avisa (el conflicto ofrece «Recargar»).
async function poner(
  pendiente: PendienteDeAgenda,
  version: string,
  hecho: boolean,
): Promise<Version> {
  if (pendiente.clase === 'tarea') {
    const envio = await enviarAccion(
      completarTarea({ id: pendiente.id, actualizadoEnEsperado: version, completada: hecho }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      avisarError(envio.error)
      return { ok: false }
    }
    return { ok: true, actualizadoEn: envio.data.actualizadoEn }
  }
  // La action es de `leads` (la RPC exige que el recordatorio sea de quien actúa).
  const envio = await enviarAccion(
    completarRecordatorio({ id: pendiente.id, actualizadoEnEsperado: version, completado: hecho }),
    MENSAJE_DE_VALIDACION,
  )
  if (!envio.ok) {
    avisarError(envio.error)
    return { ok: false }
  }
  return { ok: true, actualizadoEn: envio.data.recordatorio.actualizadoEn }
}

// «Completar» en un toque: la fila se oculta al instante (hasta que llega la relectura) y el aviso ofrece «Deshacer», que la reabre con la versión que devolvió
// la base. La action de tareas revalida `/agenda`; la de recordatorios no, por eso se relee la página.
export function useCompletarPendiente() {
  const router = useRouter()
  const [ocultos, setOcultos] = useState<ReadonlySet<string>>(() => new Set())
  const [enCurso, setEnCurso] = useState<ReadonlySet<string>>(() => new Set())
  const cambiar = (setter: typeof setOcultos, id: string, incluir: boolean) => {
    setter((antes) => {
      const nuevo = new Set(antes)
      if (incluir) {
        nuevo.add(id)
      } else {
        nuevo.delete(id)
      }
      return nuevo
    })
  }

  async function completar(pendiente: PendienteDeAgenda) {
    if (enCurso.has(pendiente.id)) {
      return
    }
    cambiar(setEnCurso, pendiente.id, true)
    const hecho = await poner(pendiente, pendiente.actualizadoEn, true)
    cambiar(setEnCurso, pendiente.id, false)
    if (!hecho.ok) {
      return
    }
    cambiar(setOcultos, pendiente.id, true)
    if (pendiente.clase === 'recordatorio') {
      router.refresh()
    }
    avisarConDeshacer(
      pendiente.clase === 'tarea' ? 'Tarea hecha.' : 'Recordatorio completado.',
      () => {
        void poner(pendiente, hecho.actualizadoEn, false).then((reabierto) => {
          if (reabierto.ok) {
            cambiar(setOcultos, pendiente.id, false)
            router.refresh()
          }
        })
      },
    )
  }

  return {
    oculto: (id: string) => ocultos.has(id),
    enCurso: (id: string) => enCurso.has(id),
    completar: (pendiente: PendienteDeAgenda) => void completar(pendiente),
  }
}

export type CompletarPendiente = ReturnType<typeof useCompletarPendiente>
