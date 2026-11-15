'use client'

import { ordenarTiposParaElegir } from '../../../entities/documentos/admision'
import { destinoDeLaUnidad } from '../../../entities/documentos/destino'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { usePuedeSubirALaUnidad } from '../hooks/use-puede-subir-a-la-unidad'
import type { DatoDeDocumentos } from '../hooks/use-documentos-de-la-unidad'
import { ZonaParaSubir } from './zona-para-subir'

// La zona de subir de la unidad (6.06-2): los tipos con los que pide una fase primero y el permiso de subir del origen de la unidad, que sale de `mis_permisos` (la base vuelve a exigirlo).
// En el drawer de la página (`DrawerParaSubir`) va sin título y se cierra al terminar.
export function ZonaParaSubirDeLaUnidad({
  unidad,
  dato,
  conTitulo,
  alTerminar,
}: {
  unidad: Unidad
  dato: DatoDeDocumentos
  conTitulo?: boolean
  alTerminar?: () => void
}) {
  const puedeSubir = usePuedeSubirALaUnidad(unidad)
  return (
    <ZonaParaSubir
      destino={destinoDeLaUnidad(unidad)}
      titulo="Subir documentos"
      tipos={ordenarTiposParaElegir(dato.tipos, new Set(dato.requisitos.map((r) => r.tipoId)))}
      puedeSubir={puedeSubir}
      {...(conTitulo === undefined ? {} : { conTitulo })}
      {...(alTerminar ? { alTerminar } : {})}
    />
  )
}
