'use client'

import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { Interruptor } from '@/shared/ui/interruptor'
import { useApertura } from '@/shared/ui/use-apertura'
import type { MiFichaEnLaWeb } from '../../../../entities/turnos/ficha'
import { useEnvioDeFicha } from '../hooks/use-envio-de-ficha'
import { CamposDeFicha } from './campos-de-ficha'

export type PropsDeModalDeFicha = {
  abierto: boolean
  alCerrar: () => void
  ficha: MiFichaEnLaWeb
}

// «Tu ficha en la web» (`?panel=ficha`): cómo te presenta la web y cómo te escriben los clientes. Cada apertura empieza de lo guardado.
export function ModalDeFicha(props: PropsDeModalDeFicha) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeFicha key={apertura} {...props} />
}

function FormularioDeFicha({ abierto, alCerrar, ficha }: PropsDeModalDeFicha) {
  const modal = useEnvioDeFicha({ ficha, abierto, alCerrar })
  return (
    <ModalDeFormulario
      id="perfil-ficha"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Tu ficha en la web"
      formulario={modal.formulario}
      focoInicial={() => document.getElementById('whatsapp')}
      detalleDelConflicto="No se guardó nada. Recargar trae tu perfil de ahora y conserva lo que escribiste."
    >
      <CamposDeFicha modal={modal} />
      <Interruptor
        titulo="Aparecer en la web"
        ayuda="Tu ficha se muestra a los visitantes y pueden escribirte directo por WhatsApp. Necesitas tu WhatsApp."
        valor={modal.publicoWeb}
        alCambiar={modal.cambiarPublico}
        deshabilitado={modal.formulario.enCurso}
      />
    </ModalDeFormulario>
  )
}
