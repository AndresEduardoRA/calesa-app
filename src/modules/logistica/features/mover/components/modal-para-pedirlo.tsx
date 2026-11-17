'use client'

import { useId, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import {
  NO_SE_ENVIO,
  PIDIENDO,
  TITULO_DEL_PEDIDO,
  YA_NO_RECIBE,
  pedirselo,
  seLoPediste,
} from '../../../entities/mover/textos'
import type { ResultadoDeEscritura } from '@/modules/agenda/client'
import { pedirLoQueFalta } from '../actions/pedir-lo-que-falta'
import type { PedidoDelRequisito } from '../hooks/use-pedirlo-por-url'
import { useQuienesPueden } from '../hooks/use-quienes-pueden'
import { QuienesPueden } from './quienes-pueden'

type Props = {
  abierto: boolean
  cerrar: () => void
  vehiculoId: string
  pedido: PedidoDelRequisito
}

const CAMPO = 'responsable_id'

// «Pedírselo a alguien» (`docs/GLOSARIO.md` › «Pedirlo»): la descripción es el título de la tarea; se elige a quién (los que pueden, con la clave en el origen y la
// unidad a la vista) y se le da una tarea sin fecha vinculada al vehículo. Un envío a la vez con el mismo id del intento en cada reintento; si esa persona ya no
// puede recibir, se dice junto a la lista y se relee. Se monta de nuevo en cada apertura (`key`): lo elegido y lo buscado no sobreviven a cerrarlo.
export function ModalParaPedirlo({ abierto, cerrar, vehiculoId, pedido }: Props) {
  const idDelFormulario = useId()
  const [id] = useState(() => crypto.randomUUID())
  const quienes = useQuienesPueden(vehiculoId, pedido.clave)
  const [elegidaId, setElegidaId] = useState<string | null>(null)
  const personas = quienes.lectura.tipo === 'listo' ? quienes.lectura.personas : []
  // Con una sola persona, ya está elegida.
  const elegida =
    personas.find((p) => p.id === elegidaId) ?? (personas.length === 1 ? personas[0] : undefined)
  const formulario = useEnvioDeModal<ResultadoDeEscritura>({
    abierto,
    hayCambios: false,
    validar: () => null,
    pedir: async () => {
      const envio = await enviarAccion<ResultadoDeEscritura>(
        pedirLoQueFalta({
          id,
          vehiculoId,
          responsableId: elegida?.id ?? '',
          titulo: pedido.titulo,
        }),
        NO_SE_ENVIO,
      )
      if (!envio.ok && 'porCampo' in envio && envio.porCampo?.[CAMPO]) {
        setElegidaId(null)
        quienes.releer()
      }
      return envio
    },
    alGuardar: () => {
      if (elegida) avisarExito(seLoPediste(elegida.nombre))
      cerrar()
    },
  })
  return (
    <ModalDeFormulario
      id={idDelFormulario}
      abierto={abierto}
      alCerrar={cerrar}
      titulo={TITULO_DEL_PEDIDO}
      descripcion={pedido.titulo}
      formulario={{ ...formulario, sinPoderEnviar: elegida === undefined || !formulario.enLinea }}
      guardar={{ etiqueta: elegida ? pedirselo(elegida.nombre) : 'Pedírselo', enCurso: PIDIENDO }}
    >
      <QuienesPueden
        clave={pedido.clave}
        lectura={quienes.lectura}
        texto={quienes.texto}
        buscar={quienes.buscar}
        releer={quienes.releer}
        elegidaId={elegida?.id ?? null}
        elegir={(persona) => {
          setElegidaId(persona)
          formulario.quitarMotivo(CAMPO)
        }}
        error={formulario.errores[CAMPO] ? YA_NO_RECIBE : undefined}
      />
    </ModalDeFormulario>
  )
}
