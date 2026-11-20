'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { useModalDeWebPublica } from '../hooks/use-modal-de-web-publica'
import { CONFLICTO_DE_INTEGRACION, type PropsDeModalDeIntegracion } from './modal-de-apibara'

// «Web pública» (`?panel=web-publica`): a dónde avisa la base qué parte de la web cambió. Vacía, se borra. Cada apertura empieza de lo guardado.
export function ModalDeWebPublica(props: PropsDeModalDeIntegracion) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeWebPublica key={apertura} {...props} />
}

function FormularioDeWebPublica({ abierto, alCerrar, integracion }: PropsDeModalDeIntegracion) {
  const modal = useModalDeWebPublica({ abierto, alCerrar, webPublica: integracion })
  const { formulario } = modal
  return (
    <ModalDeFormulario
      id="integracion-web-publica"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Configurar la web pública"
      descripcion="A dónde se le avisa al sitio qué cambió."
      formulario={formulario}
      detalleDelConflicto={CONFLICTO_DE_INTEGRACION}
    >
      <Campo
        nombre="revalidarUrl"
        etiqueta="Dirección de revalidación"
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        value={modal.direccion}
        disabled={formulario.enCurso}
        error={formulario.errores['revalidarUrl']}
        ayuda="A esta dirección se le avisa qué cambió en la web. Empieza con https://."
        onChange={(evento) => {
          modal.cambiarDireccion(evento.target.value)
        }}
      />
    </ModalDeFormulario>
  )
}
