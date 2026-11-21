'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { useRestablecerMensajeDelPortal } from '../hooks/use-restablecer-mensaje-del-portal'
import { RechazoAlRestablecer } from './rechazo-al-restablecer'

// La confirmación de «Restablecer» el mensaje del portal (`?panel=restablecer-portal`): vuelve el texto de fábrica.
export function RestablecerDelPortal({ portal }: { portal: AjustesDeLeads['portal'] }) {
  const restablecimiento = useRestablecerMensajeDelPortal(portal)
  return (
    <Confirmar
      abierto={restablecimiento.abierto}
      alCerrar={restablecimiento.cerrar}
      alConfirmar={restablecimiento.confirmar}
      titulo="Restablecer el mensaje del portal"
      descripcion="Vuelve el texto de fábrica y se pierde el de la empresa."
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
