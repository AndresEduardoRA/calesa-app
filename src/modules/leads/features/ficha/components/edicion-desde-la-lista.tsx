'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { useEdicionDesdeLaLista } from '../hooks/use-edicion-desde-la-lista'
import { EdicionFueraDeLaFichaDiferida } from './diferidos'
import type { PermisosDeEdicionFueraDeLaFicha } from './edicion-fuera-de-la-ficha'

type Props = {
  // La URL del panel: la pantalla llama `useEdicionDesdeLaLista()` una vez y le pasa `abrir` a sus «⋯».
  edicion: ReturnType<typeof useEdicionDesdeLaLista>
  permisos: PermisosDeEdicionFueraDeLaFicha
}

// «Editar lead» / «Editar teléfonos» del «⋯» de la lista y del kanban: se monta una vez por pantalla y el panel (con su código, por
// `diferido()`) llega recién al abrirse. Sin ningún permiso de edición no se monta: un `?panel=editar-lead&para=` en la URL no abre nada.
export function EdicionDesdeLaLista({ edicion, permisos }: Props) {
  const abierto = edicion.para !== null
  const apertura = useApertura(abierto)
  const leadId = useUltimo(edicion.para)
  const visto = useAbiertoAlgunaVez(abierto)
  if (!visto || leadId === null || !(permisos.editar || permisos.telefonos)) {
    return null
  }
  return (
    <EdicionFueraDeLaFichaDiferida
      key={`${String(apertura)}:${leadId}`}
      leadId={leadId}
      abierto={abierto}
      alCerrar={edicion.cerrar}
      permisos={permisos}
    />
  )
}
