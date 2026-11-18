'use client'

import { useAction } from 'next-safe-action/hooks'
import { useMemo, useState } from 'react'
import type { AccionesDeUnAviso } from '@/shared/lib/acciones-del-aviso'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { useRegional } from '@/shared/ui/regional'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { Oportunidad } from '../../../entities/oportunidad'
import {
  hayCambiosEnOportunidadRapida,
  pedidoDeOportunidadRapida,
  valoresDeOportunidadRapida,
  type PedidoDeOportunidadRapida,
} from '../../../entities/oportunidad-rapida'
import { abiertaDelRechazo, accionesDeLaAbierta } from '../../../entities/oportunidad-unica'
import type { ResultadoDeOportunidad } from '../../../entities/repositorios-de-oportunidades'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearOportunidad } from '../actions/crear-oportunidad'
import type { ErroresDelFormulario } from './use-formulario-de-oportunidad'

type Args = {
  leadId: string
  nombreDelLead: string
  // Cerrado, el modal sigue montado: no reenvía al volver la red.
  abierto: boolean
  alCrear: (oportunidad: Oportunidad) => void
}

export type RechazoConAbierta = { mensaje: string; acciones: AccionesDeUnAviso }

// Lo que quedó sin enviar por falta de red: un objeto por intento (estable entre renders).
type Pendiente = { desde: number }

type Pedido = Extract<PedidoDeOportunidadRapida, { tipo: 'crear' }>

// «Nueva oportunidad…» del «⋯»: título (con el nombre del lead) y monto. El id del intento vive con el modal, así un reintento (o
// volver la red) no crea dos. Un rechazo deja lo escrito y dice su motivo junto al campo o arriba; sin red, sale solo al volver.
export function useFormularioDeOportunidadRapida({
  leadId,
  nombreDelLead,
  abierto,
  alCrear,
}: Args) {
  const { locale } = useRegional()
  const inicial = useMemo(() => valoresDeOportunidadRapida(nombreDelLead), [nombreDelLead])
  const [valores, setValores] = useState(inicial)
  const [errores, setErrores] = useState<ErroresDelFormulario>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [rechazo, setRechazo] = useState<RechazoConAbierta | null>(null)
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [intento] = useState(() => crypto.randomUUID())
  const crear = useAction(crearOportunidad)
  const unaVez = useUnEnvioALaVez()

  function aplicar(envio: Envio<ResultadoDeOportunidad>): boolean {
    if (envio.ok) {
      setPendiente(null)
      alCrear(envio.data.oportunidad)
      return true
    }
    if ('sinRed' in envio) {
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return false
    }
    setPendiente(null)
    // Otra pestaña la creó en el medio: el embudo no es un campo de este modal, así que va arriba con «Abrir esa» y lo escrito queda.
    const abierta = abiertaDelRechazo(envio)
    if (abierta) {
      setErrores({})
      setAviso(null)
      setRechazo({ mensaje: envio.error.mensaje, acciones: accionesDeLaAbierta(leadId, abierta) })
      return false
    }
    setErrores((envio.porCampo ?? {}) as ErroresDelFormulario)
    setAviso(envio.porCampo ? null : envio.error.mensaje)
    return false
  }

  async function mandar(pedido: Pedido): Promise<boolean> {
    setAviso(null)
    setRechazo(null)
    const envio = await unaVez.mandar(() =>
      enviarAccion<ResultadoDeOportunidad>(
        crear.executeAsync({ id: intento, leadId, datos: pedido.datos }),
        MENSAJE_DE_VALIDACION,
      ),
    )
    return envio === null ? false : aplicar(envio)
  }

  async function enviar(): Promise<boolean> {
    const pedido = pedidoDeOportunidadRapida(valores, locale)
    if (pedido.tipo === 'invalido') {
      setErrores(pedido.errores)
      return false
    }
    return mandar(pedido)
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, () => enviar())

  return {
    valores,
    errores,
    aviso,
    // El rechazo de «una abierta por lead y embudo», con «Abrir esa».
    rechazo,
    // No hay versión que chocar: un id de intento repetido da `repetido`, no un conflicto.
    conflicto: null,
    enCurso: unaVez.enCurso,
    enLinea,
    esperandoConexion: pendiente !== null,
    hayCambios: hayCambiosEnOportunidadRapida(valores, inicial),
    enviar,
    reintentar: () => void enviar(),
    cambiar: (campo: 'titulo' | 'monto', valor: string) => {
      setValores((antes) => ({ ...antes, [campo]: valor }))
      const conError = campo === 'monto' ? 'monto_estimado' : campo
      setErrores(({ [conError]: _resuelto, ...resto }) => resto)
    },
  }
}
