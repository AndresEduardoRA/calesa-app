'use client'

import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import type { Unidad } from '../../../entities/nucleo/unidad'
import type { DatoDeDocumentos } from '../hooks/use-documentos-de-la-unidad'
import { ZonaParaSubirDeLaUnidad } from './zona-para-subir-de-la-unidad'

type Props = {
  abierto: boolean
  alCerrar: () => void
  unidad: Unidad
  dato: DatoDeDocumentos
}

// Subir documentos en un drawer (`?subir=documentos`), sólo en las zonas de la página de la unidad: la bandeja necesita lugar que una pestaña con alto fijo no tiene. Se monta cerrado (para que se deslice).
// Con archivos en la bandeja, cerrar pregunta (`useCambiosDeLaBandeja`); al terminar sin fallos se cierra solo y el foco vuelve al botón (la vuelta de `usePanelPorUrl`); con fallos queda abierto con
// «Reintentar los N que faltan».
export function DrawerParaSubir({ abierto, alCerrar, unidad, dato }: Props) {
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Subir documentos"
      descripcion={unidad.titulo}
      ancho="amplio"
      focoAlCerrar={focoDeQuienAbrio}
    >
      <ZonaParaSubirDeLaUnidad
        unidad={unidad}
        dato={dato}
        conTitulo={false}
        alTerminar={alCerrar}
      />
    </Drawer>
  )
}
