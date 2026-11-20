'use client'

import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { useTarjetaDeTexto } from '../hooks/use-tarjeta-de-texto'
import { CampoDelSitio } from './campo-del-sitio'
import { CONFLICTO_DE_AJUSTES_DEL_SITIO, type PropsDeModalDelSitio } from './modal-de-identidad'

// «Contacto» (`?panel=contacto`): cómo se contacta la web cuando no hay asesor y dónde está. Cada apertura empieza de lo guardado.
export function ModalDeContacto(props: PropsDeModalDelSitio) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeContacto key={apertura} {...props} />
}

function FormularioDeContacto({ abierto, alCerrar, ajustes }: PropsDeModalDelSitio) {
  const modal = useTarjetaDeTexto({ tarjeta: 'contacto', ajustes, abierto, alCerrar })
  return (
    <ModalDeFormulario
      id="sitio-contacto"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Contacto"
      formulario={modal.formulario}
      detalleDelConflicto={CONFLICTO_DE_AJUSTES_DEL_SITIO}
    >
      <CampoDelSitio
        modal={modal}
        campo="whatsappRespaldo"
        etiqueta="WhatsApp de respaldo"
        type="tel"
        inputMode="tel"
        placeholder="+59170000000"
        ayuda="Con el código de país. La web lo ofrece cuando no hay un asesor para atender."
      />
      <CampoDelSitio modal={modal} campo="horario" etiqueta="Horario" maxLength={200} />
      <CampoDelSitio
        modal={modal}
        campo="direccionPublica"
        etiqueta="Dirección pública"
        type="url"
        inputMode="url"
        placeholder="https://"
        ayuda="Con https://. Va en el mensaje de WhatsApp con que el cliente entra al portal."
      />
    </ModalDeFormulario>
  )
}
