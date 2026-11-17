'use client'

import { diferido } from '@/shared/ui/diferido'

// El modal de agendar y editar se pide recién al abrirse: «Seguimientos» no carga su código para
// mostrar la lista. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeRecordatorioDiferido = diferido(() =>
  import('./modal-de-recordatorio').then((modulo) => modulo.ModalDeRecordatorio),
)
