'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import type { OrigenConUso } from '../../../entities/origen'

type Props = {
  origen: OrigenConUso
  abierto: boolean
  enCurso: boolean
  alCerrar: () => void
  alConfirmar: () => Promise<void>
}

// La confirmación de eliminar un origen, con su palabra clave (el nombre): no se puede deshacer. Viaja aparte (`diferidos.tsx`): se pide al abrirse.
export function ConfirmarEliminarOrigen({
  origen,
  abierto,
  enCurso,
  alCerrar,
  alConfirmar,
}: Props) {
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={alConfirmar}
      titulo={`Eliminar el origen ${origen.nombre}`}
      descripcion={`Se elimina «${origen.nombre}» con sus ${origen.uso.camposActivos} campos activos, ${origen.uso.categorias} categorías y ${origen.uso.concesiones} permisos acotados a él. No se puede deshacer.`}
      etiquetaConfirmar="Eliminar origen"
      enCurso={enCurso}
      palabraClave={origen.nombre}
    />
  )
}
