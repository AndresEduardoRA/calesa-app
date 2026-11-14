// La subasta cerrada de un vehículo que se va a cotizar: cuándo se avisa en la hoja y en la fila del panel, y qué dice el aviso. La situación la
// calcula la base (`entities/situacion.ts`): acá sólo se decide qué se muestra con ella. Sin React ni I/O.
import { accionesDeSituacion, etiquetaDeSituacion, type Situacion } from './situacion'

export type SubastaParaAvisar = {
  situacion: Situacion
  // `vehiculos.cierre_subasta_en`: sólo con la subasta viva (abierta o en vivo); ISO o null.
  cierreSubastaEn: string | null
}

// La subasta ya pasó y el vehículo sigue en el tramo de la subasta: «Sin resolver» o «No ganada». «En subasta» con el cierre ya vencido también
// cuenta: la base la pasa a «Sin resolver» en el próximo ciclo (≤ 10 min) y entre medio el aviso no debe callar. Una subasta sin fecha que sigue viva
// no está cerrada. Un vehículo que ya está en su fase (se ganó, o salió del tramo) no se avisa: cotizarlo es lo normal.
export function subastaCerrada(subasta: SubastaParaAvisar, ahora: Date): boolean {
  switch (subasta.situacion) {
    case 'sin_resolver':
    case 'no_ganada':
      return true
    case 'en_subasta':
      return subasta.cierreSubastaEn !== null && new Date(subasta.cierreSubastaEn) <= ahora
    case 'fase':
      return false
  }
}

// Lo que el aviso nombra de la situación: nada si la base todavía dice «En subasta» (aún no se actualizó).
export function situacionDelAviso(situacion: Situacion): string | null {
  return situacion === 'en_subasta' ? null : etiquetaDeSituacion(situacion, null).texto
}

export const CONSULTAR_GASTA_CUOTA = 'Consultar a apibara gasta cuota.'

// Las acciones de resolver que ofrece el aviso: las de la ficha (`accionesDeSituacion`) sin «Deshacer», que en una hoja de cotizar no tiene verbo
// ni objeto claros.
export function resolverDelAviso(pedido: { situacion: Situacion; puede: boolean }) {
  return { ...accionesDeSituacion(pedido), deshacer: false }
}

export type DatosDelAviso = {
  vehiculoId: string
  origenId: string
  nombreDelOrigen: string
  situacion: Situacion
  // Cuándo cerró (`subasta_fin_en` o, si no, `subasta_en`): ISO; null si la subasta no tiene fecha.
  cierre: string | null
  estadoDelPatio: unknown
  // La versión del vehículo que se ve (el refresco la compara).
  actualizadoEn: string
  // Con qué se vuelve a preguntar a apibara (enlace, lote o VIN); null si no hay con qué.
  entrada: string | null
  // apibara encendida y quien mira puede editar el vehículo: «Refrescar la subasta».
  puedeRefrescar: boolean
  // Quien puede ir a Integraciones si la clave o la cuota frenan.
  puedeConfigurar: boolean
  // Quien mira puede resolver la subasta (`puedeResolverLaSubasta`).
  puedeResolver: boolean
}
