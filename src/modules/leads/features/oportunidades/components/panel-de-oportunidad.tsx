'use client'

import { useRouter } from 'next/navigation'
import { useId } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { Embudo } from '../../../entities/embudo'
import type { Oportunidad } from '../../../entities/oportunidad'
import {
  embudosParaCrear,
  MOTIVO_SIN_EMBUDO_LIBRE,
  type AbiertaEnEmbudo,
} from '../../../entities/oportunidad-unica'
import { useFormularioDeOportunidad } from '../hooks/use-formulario-de-oportunidad'
import { CamposDeOportunidad } from './campos-de-oportunidad'

type Props = {
  leadId: string
  // La que se edita; null = «Nueva oportunidad».
  oportunidad: Oportunidad | null
  embudos: readonly Embudo[]
  // Dónde el lead ya tiene una abierta: al crear, esos embudos van apagados (una abierta por lead y embudo).
  abiertas: readonly AbiertaEnEmbudo[]
  alGuardar: (oportunidad: Oportunidad) => void
  alCerrar: () => void
}

// «Nueva oportunidad» o «Editar»: un Drawer con su URL. Una nueva entra en la etapa inicial de su
// embudo; se mueve después con «Mover a…».
export function PanelDeOportunidad({
  leadId,
  oportunidad,
  embudos,
  abiertas,
  alGuardar,
  alCerrar,
}: Props) {
  const router = useRouter()
  const paraCrear = embudosParaCrear(embudos, abiertas)
  const formulario = useFormularioDeOportunidad({
    leadId,
    oportunidad,
    alGuardar: (guardada) => {
      alGuardar(guardada)
      // Una nueva ocupa su embudo: la sección vuelve a leer dónde hay abiertas.
      if (!oportunidad) {
        router.refresh()
      }
    },
    alTerminar: alCerrar,
    embudoInicial: paraCrear.inicial ?? '',
  })
  // Ningún embudo libre: no hay dónde crear.
  const sinEmbudoLibre = !oportunidad && paraCrear.inicial === null
  const idFormulario = useId()
  return (
    <Drawer
      abierto
      alCerrar={alCerrar}
      titulo={oportunidad ? 'Editar oportunidad' : 'Nueva oportunidad'}
      descripcion={
        oportunidad ? undefined : 'Entra en la etapa inicial de tu embudo. Sólo tú la ves.'
      }
      pie={
        <PieDelPanel
          idFormulario={idFormulario}
          enCurso={formulario.enCurso}
          alCancelar={alCerrar}
          etiquetaDeGuardar={oportunidad ? 'Guardar' : 'Crear oportunidad'}
          sinPuedeEnviar={formulario.sinCambios || sinEmbudoLibre}
        />
      }
    >
      <CambiosSinGuardar hayCambios={formulario.hayCambios} />
      <form
        id={idFormulario}
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void formulario.enviar()
        }}
      >
        {formulario.conflicto ? (
          <AvisoDeConflicto mensaje={formulario.conflicto} alRecargar={formulario.recargar} />
        ) : null}
        {sinEmbudoLibre ? <Aviso tono="info">{MOTIVO_SIN_EMBUDO_LIBRE}</Aviso> : null}
        <CamposDeOportunidad
          formulario={formulario}
          oportunidad={oportunidad}
          opcionesDeEmbudo={embudos.length > 1 ? paraCrear.opciones : null}
        />
      </form>
    </Drawer>
  )
}
