import 'server-only'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { leerSubasta } from '../../composicion'
import { puedeResolverLaSubasta } from '../../entities/situacion'
import { entradaDeRefresco } from '../../entities/subasta'
import { subastaCerrada, type DatosDelAviso } from '../../entities/subasta-cerrada'
import { CLAVE_DEL_ESTADO_DEL_PATIO } from '../../entities/zona-del-patio'
import type { SubastaDeVehiculo } from '../../entities/subasta-vehiculo'
import type { Vehiculo } from '../../entities/vehiculo'

type Pedido = {
  // El vehículo de la hoja, tal como lo leyó la página.
  vehiculo: Vehiculo
  origen: { id: string; nombre: string; tipo: string }
  permisos: Permisos
  // Si quien mira puede editar el vehículo (`editablesDe`: lo decide la base).
  editable: boolean
  // apibara encendida (`integracionActiva('apibara')`: `vehiculos` no conoce `empresa`).
  apibaraActiva: boolean
  ahora: Date
}

// Cuándo cerró: la fecha de la subasta si ya llegó (una que todavía no llegó no es la del cierre).
function cierreDe(subasta: SubastaDeVehiculo | null, ahora: Date): string | null {
  const fecha = subasta?.subastaFinEn ?? subasta?.subastaEn ?? null
  return fecha !== null && new Date(fecha) <= ahora ? fecha : null
}

// El aviso de la hoja de cotizar cuando la subasta del vehículo elegido ya cerró (`subastaCerrada`); null si no hay nada que avisar. Un vehículo de
// otro origen o en su fase no lee nada. La fecha sale de la subasta (la columna `cierre_subasta_en` es nula con la subasta cerrada); si esa lectura
// falla el aviso se dibuja igual, sin fecha: no tumba la hoja.
export async function avisoDeSubastaCerrada(pedido: Pedido): Promise<DatosDelAviso | null> {
  const { vehiculo, origen, permisos, editable, apibaraActiva, ahora } = pedido
  if (origen.tipo !== 'subasta' || vehiculo.situacion === 'fase') {
    return null
  }
  const leida = await leerSubasta(vehiculo.id)
  if (!leida.ok) {
    console.error('la subasta del vehículo de la hoja no respondió', leida.error)
  }
  const subasta = leida.ok ? leida.data : null
  const cierre = cierreDe(subasta, ahora)
  if (!subastaCerrada({ situacion: vehiculo.situacion, cierreSubastaEn: cierre }, ahora)) {
    return null
  }
  const entrada = entradaDeRefresco(vehiculo)
  return {
    vehiculoId: vehiculo.id,
    origenId: origen.id,
    nombreDelOrigen: origen.nombre,
    situacion: vehiculo.situacion,
    cierre,
    estadoDelPatio: vehiculo.atributos[CLAVE_DEL_ESTADO_DEL_PATIO] ?? null,
    actualizadoEn: vehiculo.actualizadoEn,
    entrada,
    puedeRefrescar: apibaraActiva && editable && entrada !== null,
    puedeConfigurar: puede(permisos, 'empresa.ajustes.gestionar'),
    puedeResolver: puedeResolverLaSubasta(permisos, origen.id),
  }
}
