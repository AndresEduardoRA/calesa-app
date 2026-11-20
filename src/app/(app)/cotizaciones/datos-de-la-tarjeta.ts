import {
  leerAsesorQueMira,
  leerAutorDeLaCotizacion,
  tituloAparteDelNumero,
  tituloDeLaCotizacion,
  type AsesorDeLaTarjeta,
} from '@/modules/cotizaciones'
import { leerClienteElegido } from '@/modules/leads'
import { leerVehiculo } from '@/modules/vehiculos'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { datosO } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'

// Lo que una guardada lee para su tarjeta y la comparten su página y la ruta de su PDF: el cliente (sólo con `leads.ver`, y si quien mira lo ve), el vehículo (si
// lo ve) y el asesor, que es quien mira. Un error al leer el cliente o el vehículo sube (la página lo lleva a su `error.tsx`); la ruta del PDF lo pasa por `oNulo()`
// y el PDF sale sin ese dato. Un error al leer el asesor lo deja sin nombrar.
export async function clienteDe(permisos: Permisos, leadId: string | null) {
  return leadId === null || !puede(permisos, 'leads.ver')
    ? null
    : datosO(await leerClienteElegido(leadId))
}

export async function vehiculoDe(vehiculoId: string | null) {
  return vehiculoId === null ? null : datosO(await leerVehiculo(vehiculoId))
}

// El asesor de la tarjeta: quien la mira o la comparte (también en la hoja nueva y con «Ver como»), con su foto de `avatares` como URL pública, y si se leyó
// (`leido` falso: la lectura falló y la tarjeta sale sin él; la imagen, además, sin ETag).
export async function asesorLeido(): Promise<{
  asesor: AsesorDeLaTarjeta | null
  leido: boolean
}> {
  const lectura = await leerAsesorQueMira()
  if (!lectura.ok || lectura.data === null) {
    return { asesor: null, leido: lectura.ok }
  }
  const { fotoRuta, ...asesor } = lectura.data
  return { asesor: { ...asesor, foto: urlPublicaONull('avatares', fotoRuta) }, leido: true }
}

export const asesorQueMira = async (): Promise<AsesorDeLaTarjeta | null> =>
  (await asesorLeido()).asesor

// El autor de una guardada (quien la creó), para «Creado por» de «Compartir»; un error lo deja sin nombrar.
export async function autorDe(id: string): Promise<string | null> {
  const lectura = await leerAutorDeLaCotizacion(id)
  return lectura.ok ? lectura.data : null
}

// El título de la tarjeta y del PDF de una guardada: el guardado (la tarjeta dibuja lo guardado), sin el de respaldo «Cotización n.º N», que ya escribe el número.
export const tituloDeLaTarjeta = (
  cotizacion: { titulo: string | null; numero: number },
  vehiculo: { titulo: string } | null,
) =>
  tituloAparteDelNumero(
    tituloDeLaCotizacion({
      titulo: cotizacion.titulo,
      vehiculo: vehiculo?.titulo ?? null,
      numero: cotizacion.numero,
    }),
  )

// El vehículo como lo nombra la tarjeta: su título, su lote y su VIN.
export const vehiculoDeLaTarjeta = (
  v: { titulo: string; lote: string | null; vin: string | null } | null,
) => (v === null ? null : { titulo: v.titulo, lote: v.lote, vin: v.vin })

// Un error de la lectura es «sin ese dato» (la ruta del PDF: el PDF sale igual).
export const oNulo = <T>(lectura: Promise<T>): Promise<T | null> => lectura.catch(() => null)
