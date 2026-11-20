'use client'

import { Aviso } from '@/shared/ui/aviso'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { ETIQUETA_DE_RED, REDES_DEL_SITIO } from '../../../../entities/sitio/ajustes'
import { useTarjetaDeTexto } from '../hooks/use-tarjeta-de-texto'
import { CampoDelSitio } from './campo-del-sitio'
import { CONFLICTO_DE_AJUSTES_DEL_SITIO, type PropsDeModalDelSitio } from './modal-de-identidad'

// «Redes» (`?panel=redes`): las que la web enlaza; las que quedan vacías no se muestran. El rechazo de la base (`redes`) va arriba. Cada apertura
// empieza de lo guardado.
export function ModalDeRedes(props: PropsDeModalDelSitio) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeRedes key={apertura} {...props} />
}

function FormularioDeRedes({ abierto, alCerrar, ajustes }: PropsDeModalDelSitio) {
  const modal = useTarjetaDeTexto({ tarjeta: 'redes', ajustes, abierto, alCerrar })
  const rechazo = modal.formulario.errores['redes']
  return (
    <ModalDeFormulario
      id="sitio-redes"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Redes"
      descripcion="Las que quedan vacías no se muestran."
      formulario={modal.formulario}
      detalleDelConflicto={CONFLICTO_DE_AJUSTES_DEL_SITIO}
    >
      {rechazo ? <Aviso tono="peligro">{rechazo}</Aviso> : null}
      {REDES_DEL_SITIO.map((red) => (
        <CampoDelSitio
          key={red}
          modal={modal}
          campo={red}
          etiqueta={ETIQUETA_DE_RED[red]}
          type="url"
          inputMode="url"
          placeholder="https://"
        />
      ))}
    </ModalDeFormulario>
  )
}
