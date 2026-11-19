'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import type { FormularioDelModal } from '@/shared/ui/modal-de-formulario'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { esquemaDeNotaDePlantilla } from '../../../entities/plantilla/escritura-de-la-plantilla'

type Args = {
  // Cerrado (se canceló o se fue con «atrás»), lo que esperaba la red no sale.
  abierto: boolean
  // El `actualizadoEn` del borrador que la pestaña leyó: la versión del formulario. Un conflicto se va cuando llega otra; nula, no hay nada que publicar.
  esperada: string | null
  // El pedido, con la nota ya recortada y la esperada de ahora: una action sobre `enviarAccion()`.
  pedir: (nota: string, esperada: string) => Promise<Envio<string>>
  // Entró: avisar y cerrar.
  alGuardar: (id: string) => void
}

type Pendiente = { desde: number }

type Rechazo = Exclude<Extract<Envio<string>, { ok: false }>, { sinRed: true }>

// Un rechazo: el PT409 es un conflicto; el de la nota va junto al campo; una regla contra la fórmula trae su `porCampo` de otro lado y su mensaje va arriba, con la nota
// intacta y el lugar de la tarjeta para «Ir a la celda».
function queDiceElRechazo(
  envio: Rechazo,
):
  | { tipo: 'conflicto' | 'nota'; mensaje: string }
  | { tipo: 'aviso'; aviso: string; donde: string | null } {
  if (envio.error.codigo === 'conflicto') return { tipo: 'conflicto', mensaje: envio.error.mensaje }
  const deLaNota = envio.porCampo?.['nota']
  if (deLaNota !== undefined) return { tipo: 'nota', mensaje: deLaNota }
  return {
    tipo: 'aviso',
    aviso: envio.error.mensaje,
    donde: Object.keys(envio.porCampo ?? {}).find(esUnLugarDeLaTarjeta) ?? null,
  }
}

// Un `donde` que nombra una celda, una fila o una columna de la cuadrícula.
export const esUnLugarDeLaTarjeta = (donde: string): boolean =>
  /^(celdas|filas|columnas)[.[]/.test(donde)

export type FormularioDePublicacionDeLaTarjeta = FormularioDelModal & {
  nota: string
  motivoDeNota: string | null
  // El lugar de la tarjeta que la base rechazó (`celdas.<id>`, `filas.<id>`…): «Ir a la celda» lo elige en el lienzo. Nulo sin rechazo o si no nombra un lugar.
  donde: string | null
  // Ya entró: lo que cambie mientras el modal se va no se dice.
  guardado: boolean
  escribir: (valor: string) => void
  recargar: () => void
}

// El formulario del modal que publica el borrador de la tarjeta (4.19-3c): la nota (obligatoria, P4), validada con el esquema de la action antes de pedir; un envío a
// la vez; el PT409 como conflicto con el mensaje de la base, que espera el borrador nuevo (lo trae «Recargar») y **conserva la nota**; sin conexión, la nota queda y
// sale sola al volver; cualquier otro rechazo (una regla contra la fórmula) es un aviso arriba y no toca la nota. Propio de `plantilla`: la guarda de áreas no deja
// importar el de la fórmula.
export function useFormularioDePublicacionDeLaTarjeta({
  abierto,
  esperada,
  pedir,
  alGuardar,
}: Args): FormularioDePublicacionDeLaTarjeta {
  const router = useRouter()
  const [nota, setNota] = useState('')
  const [motivoDeNota, setMotivoDeNota] = useState<string | null>(null)
  // Un rechazo que no es de la nota: su mensaje y, si nombra uno, el lugar de la tarjeta.
  const [rechazo, setRechazo] = useState<{ aviso: string; donde: string | null } | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(esperada)
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [recargando, recargarPagina] = useTransition()
  const { mandar, enCurso } = useUnEnvioALaVez()

  async function enviar(): Promise<boolean> {
    if (conflicto !== null || esperada === null) return false
    const leida = esquemaDeNotaDePlantilla.safeParse(nota)
    if (!leida.success) {
      setMotivoDeNota(leida.error.issues[0]?.message ?? null)
      return false
    }
    setRechazo(null)
    const envio = await mandar(() => pedir(leida.data, esperada))
    if (envio === null) return false
    if (envio.ok) {
      setPendiente(null)
      setGuardado(true)
      alGuardar(envio.data)
      return true
    }
    if ('sinRed' in envio) {
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return false
    }
    setPendiente(null)
    rechazado(envio)
    return false
  }

  function rechazado(envio: Rechazo) {
    const r = queDiceElRechazo(envio)
    if (r.tipo === 'aviso') setRechazo({ aviso: r.aviso, donde: r.donde })
    else if (r.tipo === 'conflicto') setConflicto(r.mensaje)
    else setMotivoDeNota(r.mensaje)
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, () => enviar())

  return {
    nota,
    motivoDeNota,
    donde: rechazo?.donde ?? null,
    guardado,
    enCurso,
    hayCambios: nota.trim() !== '',
    conflicto,
    aviso: rechazo?.aviso ?? null,
    enLinea,
    esperandoConexion: pendiente !== null,
    recargando,
    escribir: (valor) => {
      setNota(valor)
      setMotivoDeNota(null)
    },
    enviar,
    reintentar: () => {
      void enviar()
    },
    // El borrador nuevo llega con la pestaña; la nota se conserva.
    recargar: () => {
      recargarPagina(() => {
        router.refresh()
      })
    },
  }
}
