'use client'

import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { useBorradorDeDatosLegales } from '../hooks/use-borrador-de-datos-legales'
import { useGuardarTarjeta } from '../hooks/use-guardar-tarjeta'
import { CampoEscrito } from './campos-del-modal'
import { CONFLICTO_DE_AJUSTES, type PropsDeModalDeAjustes } from './modal-de-identidad'

// «Datos legales y de contacto» (`?panel=datos-legales`): siete campos, así que guarda borrador en `sessionStorage` (más de 6). Cada
// apertura empieza de lo guardado, o de lo que quedó sin guardar.
export function ModalDeDatosLegales(props: PropsDeModalDeAjustes) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeDatosLegales key={apertura} {...props} />
}

function FormularioDeDatosLegales(props: PropsDeModalDeAjustes) {
  const guardable = useGuardarTarjeta({ tarjeta: 'datos-legales', ...props })
  const formulario = useBorradorDeDatosLegales(guardable, props.ajustes)
  return (
    <ModalDeFormulario
      id="ajustes-datos-legales"
      abierto={props.abierto}
      alCerrar={props.alCerrar}
      titulo="Datos legales y de contacto"
      descripcion="Salen en las cotizaciones, los comprobantes y la web pública."
      ancho="amplio"
      formulario={formulario}
      detalleDelConflicto={CONFLICTO_DE_AJUSTES}
    >
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <CampoEscrito
          formulario={formulario}
          campo="razonSocial"
          etiqueta="Razón social"
          maxLength={160}
        />
        <CampoEscrito
          formulario={formulario}
          campo="nit"
          etiqueta="NIT"
          autoComplete="off"
          maxLength={40}
        />
        <CampoEscrito
          formulario={formulario}
          campo="direccion"
          etiqueta="Dirección"
          autoComplete="street-address"
          maxLength={200}
        />
        <CampoEscrito
          formulario={formulario}
          campo="ciudad"
          etiqueta="Ciudad"
          autoComplete="address-level2"
          maxLength={80}
        />
        <CampoEscrito
          formulario={formulario}
          campo="telefono"
          etiqueta="Teléfono"
          type="tel"
          autoComplete="tel"
          maxLength={40}
        />
        <CampoEscrito
          formulario={formulario}
          campo="whatsapp"
          etiqueta="WhatsApp"
          type="tel"
          maxLength={40}
        />
      </div>
      <CampoEscrito
        formulario={formulario}
        campo="email"
        etiqueta="Correo de contacto"
        type="email"
        autoComplete="email"
      />
    </ModalDeFormulario>
  )
}
