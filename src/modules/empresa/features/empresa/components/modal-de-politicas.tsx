'use client'

import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import {
  GRACIA_MAXIMA_DIAS,
  GRACIA_MINIMA_DIAS,
  RETENCION_MAXIMA_DIAS,
  RETENCION_MINIMA_DIAS,
} from '../../../entities/ajustes-empresa'
import { useGuardarTarjeta } from '../hooks/use-guardar-tarjeta'
import { CampoEscrito, InterruptorEscrito } from './campos-del-modal'
import { CONFLICTO_DE_AJUSTES, type PropsDeModalDeAjustes } from './modal-de-identidad'

// «Políticas» (`?panel=politicas`): quién puede crear su cuenta, cuánto se guarda lo borrado y la limpieza automática de subastas.
export function ModalDePoliticas(props: PropsDeModalDeAjustes) {
  const apertura = useApertura(props.abierto)
  return <FormularioDePoliticas key={apertura} {...props} />
}

function FormularioDePoliticas(props: PropsDeModalDeAjustes) {
  const formulario = useGuardarTarjeta({ tarjeta: 'politicas', ...props })
  return (
    <ModalDeFormulario
      id="ajustes-politicas"
      abierto={props.abierto}
      alCerrar={props.alCerrar}
      titulo="Políticas"
      descripcion="Quién puede crear su cuenta, cuánto tiempo se guarda lo borrado y la limpieza automática."
      ancho="amplio"
      formulario={formulario}
      detalleDelConflicto={CONFLICTO_DE_AJUSTES}
    >
      <InterruptorEscrito
        formulario={formulario}
        campo="registroAbierto"
        titulo="Registro abierto"
        ayuda="Con el registro abierto, cualquiera puede crear su cuenta desde la pantalla de ingreso. Cerrado, sólo entra quien recibe una invitación."
      />
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <CampoEscrito
          formulario={formulario}
          campo="papeleraDias"
          etiqueta="Retención de la papelera (días)"
          type="number"
          inputMode="numeric"
          min={RETENCION_MINIMA_DIAS}
          max={RETENCION_MAXIMA_DIAS}
          ayuda="Lo que se manda a la papelera se borra del todo pasado este plazo."
        />
        <CampoEscrito
          formulario={formulario}
          campo="actividadDias"
          etiqueta="Retención de la actividad (días)"
          type="number"
          inputMode="numeric"
          min={RETENCION_MINIMA_DIAS}
          max={RETENCION_MAXIMA_DIAS}
          ayuda="El registro de quién hizo qué se conserva este plazo."
        />
      </div>
      <InterruptorEscrito
        formulario={formulario}
        campo="limpiezaAutomatica"
        titulo="Limpieza automática de subastas"
        ayuda="Cada madrugada, los vehículos importados de una subasta que terminó hace más de los días de gracia y que nadie usa se mandan solos a la papelera. Se avisa antes en el listado y en la ficha, y se puede conservar uno. Apagada, no se mueve nada ni se muestra ningún aviso."
      />
      <CampoEscrito
        formulario={formulario}
        campo="limpiezaDiasGracia"
        etiqueta="Días de gracia de la limpieza"
        type="number"
        inputMode="numeric"
        min={GRACIA_MINIMA_DIAS}
        max={GRACIA_MAXIMA_DIAS}
        ayuda="Días que pasan desde que terminó la subasta hasta que el vehículo, si no tiene nada vinculado ni registrado, va a la papelera."
      />
    </ModalDeFormulario>
  )
}
