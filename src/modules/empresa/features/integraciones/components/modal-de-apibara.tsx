'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import type { Integracion } from '../../../entities/integraciones'
import { useModalDeApibara } from '../hooks/use-modal-de-apibara'
import { PlataformasDeApibara } from './plataformas-de-apibara'

export type PropsDeModalDeIntegracion = {
  abierto: boolean
  alCerrar: () => void
  // La fila de la integración con su versión: llega por props al abrir y nunca va en la `key`.
  integracion: Integracion
}

export const CONFLICTO_DE_INTEGRACION =
  'Recargar trae la versión de ahora y conserva lo que escribiste.'

// «apibara» (`?panel=apibara`): a dónde se le pregunta y de qué plataformas. La clave es otro modal. Cada apertura empieza de lo guardado.
export function ModalDeApibara(props: PropsDeModalDeIntegracion) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeApibara key={apertura} {...props} />
}

function FormularioDeApibara({ abierto, alCerrar, integracion }: PropsDeModalDeIntegracion) {
  const modal = useModalDeApibara({ abierto, alCerrar, apibara: integracion })
  const { formulario } = modal
  return (
    <ModalDeFormulario
      id="integracion-apibara"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Configurar apibara"
      descripcion="A dónde se le pregunta y de qué plataformas de subasta."
      formulario={formulario}
      detalleDelConflicto={CONFLICTO_DE_INTEGRACION}
    >
      <Campo
        nombre="endpoint"
        etiqueta="Dirección del servicio"
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        value={modal.endpoint}
        disabled={formulario.enCurso}
        error={formulario.errores['endpoint']}
        ayuda="A esta dirección se le manda la clave: sólo puede ser de apibara.tech."
        onChange={(evento) => {
          modal.cambiarEndpoint(evento.target.value)
        }}
      />
      <PlataformasDeApibara
        elegidas={modal.plataformas}
        alCambiar={modal.cambiarPlataformas}
        error={formulario.errores['plataformas']}
        deshabilitado={formulario.enCurso}
      />
    </ModalDeFormulario>
  )
}
