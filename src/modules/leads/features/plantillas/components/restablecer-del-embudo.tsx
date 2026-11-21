'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { useRestablecerPlantillaDelEmbudo } from '../hooks/use-restablecer-plantilla-del-embudo'
import { RechazoAlRestablecer } from './rechazo-al-restablecer'

// La confirmación de «Restablecer» la plantilla del embudo (`?panel=restablecer-embudo`): vuelven las etapas de fábrica.
export function RestablecerDelEmbudo({ embudo }: { embudo: AjustesDeLeads['embudo'] }) {
  const restablecimiento = useRestablecerPlantillaDelEmbudo(embudo)
  return (
    <Confirmar
      abierto={restablecimiento.abierto}
      alCerrar={restablecimiento.cerrar}
      alConfirmar={restablecimiento.confirmar}
      titulo="Restablecer la plantilla del embudo"
      descripcion="Vuelven las etapas de fábrica y se pierden las de la plantilla. Los embudos que ya existen no cambian."
      etiquetaConfirmar="Restablecer"
      enCurso={restablecimiento.enCurso}
    >
      <RechazoAlRestablecer
        rechazo={restablecimiento.rechazo}
        alRecargar={restablecimiento.recargar}
      />
    </Confirmar>
  )
}
