'use client'

import { Aviso } from '@/shared/ui/aviso'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { ListaDeEtapas } from '../../embudo/components/lista-de-etapas'
import { useModalDeLaPlantillaDelEmbudo } from '../hooks/use-modal-de-la-plantilla-del-embudo'

type Props = {
  abierto: boolean
  alCerrar: () => void
  embudo: AjustesDeLeads['embudo']
}

// «Plantilla del embudo» (`?panel=embudo`): las etapas con que nace el embudo de cada persona. Cada apertura empieza de lo guardado.
export function ModalDePlantillaDelEmbudo(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeLaPlantilla key={apertura} {...props} />
}

function FormularioDeLaPlantilla({ abierto, alCerrar, embudo }: Props) {
  const modal = useModalDeLaPlantillaDelEmbudo({ embudo, abierto, alCerrar })
  return (
    <ModalDeFormulario
      id="plantilla-del-embudo"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Plantilla del embudo"
      descripcion="Las etapas con que nace el embudo de cada persona. Los embudos que ya existen no cambian."
      ancho="grande"
      formulario={modal.formulario}
      detalleDelConflicto="Lo que cambiaste sigue acá."
    >
      {modal.motivo ? (
        <Aviso tono="peligro">
          <p>{modal.motivo}</p>
        </Aviso>
      ) : null}
      <ListaDeEtapas panel={modal.panel} />
    </ModalDeFormulario>
  )
}
