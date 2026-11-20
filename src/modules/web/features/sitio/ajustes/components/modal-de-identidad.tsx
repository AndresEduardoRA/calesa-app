'use client'

import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import type { AjustesDelSitio } from '../../../../entities/sitio/ajustes'
import { useTarjetaDeTexto } from '../hooks/use-tarjeta-de-texto'
import { CampoDelSitio } from './campo-del-sitio'

export type PropsDeModalDelSitio = {
  abierto: boolean
  alCerrar: () => void
  // Lo guardado, con la versión de la fila: llega por props y nunca va en la `key`.
  ajustes: AjustesDelSitio
}

export const CONFLICTO_DE_AJUSTES_DEL_SITIO =
  'Recargar trae la versión de ahora y conserva lo que escribiste.'

// «Identidad del sitio» (`?panel=identidad`): el nombre y el lema con que la web se presenta. Cada apertura empieza de lo guardado.
export function ModalDeIdentidad(props: PropsDeModalDelSitio) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeIdentidad key={apertura} {...props} />
}

function FormularioDeIdentidad({ abierto, alCerrar, ajustes }: PropsDeModalDelSitio) {
  const modal = useTarjetaDeTexto({ tarjeta: 'identidad', ajustes, abierto, alCerrar })
  return (
    <ModalDeFormulario
      id="sitio-identidad"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Identidad del sitio"
      formulario={modal.formulario}
      detalleDelConflicto={CONFLICTO_DE_AJUSTES_DEL_SITIO}
    >
      <CampoDelSitio modal={modal} campo="nombreSitio" etiqueta="Nombre del sitio" maxLength={80} />
      <CampoDelSitio modal={modal} campo="lema" etiqueta="Lema" maxLength={160} />
    </ModalDeFormulario>
  )
}
