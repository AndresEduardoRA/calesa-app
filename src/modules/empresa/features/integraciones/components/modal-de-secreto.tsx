'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { useModalDeSecreto } from '../hooks/use-modal-de-secreto'
import { CONFLICTO_DE_INTEGRACION, type PropsDeModalDeIntegracion } from './modal-de-apibara'
import { TEXTOS_DEL_SECRETO, type ClaveConSecreto } from '../../../entities/textos-del-secreto'

type Props = PropsDeModalDeIntegracion & { clave: ClaveConSecreto }

// «Cargar la clave» / «Reemplazar la clave» (`?panel=clave-apibara`, `?panel=secreto-web-publica`). Nunca se muestra: del guardado sólo se sabe
// cuándo se guardó, y el campo nace vacío en cada apertura.
export function ModalDeSecreto(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeSecreto key={apertura} {...props} />
}

function FormularioDeSecreto({ abierto, alCerrar, clave, integracion }: Props) {
  const modal = useModalDeSecreto({ abierto, alCerrar, clave, integracion })
  const { formulario } = modal
  const textos = TEXTOS_DEL_SECRETO[clave]
  const guardado = integracion.secretoGuardadoEn !== null
  return (
    <ModalDeFormulario
      id={`integracion-${textos.modal}`}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={guardado ? textos.reemplazar : textos.cargar}
      descripcion="Se guarda cifrada y no vuelve a mostrarse."
      formulario={formulario}
      detalleDelConflicto={CONFLICTO_DE_INTEGRACION}
    >
      <Campo
        nombre={textos.nombre}
        etiqueta={guardado ? textos.etiquetaNueva : textos.etiqueta}
        type="password"
        // Que el navegador no proponga una contraseña guardada ni ofrezca guardar esta.
        autoComplete="new-password"
        spellCheck={false}
        value={modal.secreto}
        disabled={formulario.enCurso}
        error={formulario.errores['secreto']}
        onChange={(evento) => {
          modal.cambiarSecreto(evento.target.value)
        }}
      />
    </ModalDeFormulario>
  )
}
