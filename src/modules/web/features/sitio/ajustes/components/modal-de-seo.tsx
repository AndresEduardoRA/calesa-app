'use client'

import { Aviso } from '@/shared/ui/aviso'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { useTarjetaDeTexto } from '../hooks/use-tarjeta-de-texto'
import { CampoDelSitio } from './campo-del-sitio'
import { CONFLICTO_DE_AJUSTES_DEL_SITIO, type PropsDeModalDelSitio } from './modal-de-identidad'

// «SEO» (`?panel=seo`): cómo aparece la web en Google y al compartirla. El rechazo de la base (`seo`) va arriba. Cada apertura empieza de lo guardado.
export function ModalDeSeo(props: PropsDeModalDelSitio) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeSeo key={apertura} {...props} />
}

function FormularioDeSeo({ abierto, alCerrar, ajustes }: PropsDeModalDelSitio) {
  const modal = useTarjetaDeTexto({ tarjeta: 'seo', ajustes, abierto, alCerrar })
  const rechazo = modal.formulario.errores['seo']
  return (
    <ModalDeFormulario
      id="sitio-seo"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="SEO"
      descripcion="Cómo aparece la web en Google y al compartirla."
      formulario={modal.formulario}
      detalleDelConflicto={CONFLICTO_DE_AJUSTES_DEL_SITIO}
    >
      {rechazo ? <Aviso tono="peligro">{rechazo}</Aviso> : null}
      <CampoDelSitio
        modal={modal}
        campo="seoTitulo"
        etiqueta="Título para buscadores"
        maxLength={70}
      />
      <CampoDelSitio
        modal={modal}
        campo="seoDescripcion"
        etiqueta="Descripción para buscadores"
        maxLength={160}
      />
    </ModalDeFormulario>
  )
}
