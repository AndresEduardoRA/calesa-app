import {
  enlaceParaCompartir,
  tituloDeLaCotizacion,
  type DatosParaCompartir,
} from '@/modules/cotizaciones'
import { zonaDelPatioDe, type Vehiculo } from '@/modules/vehiculos'

type Subasta = { subastaEn: string | null; subastaFinEn: string | null }

// El instante como ISO de `Date` (la base puede mandarlo con microsegundos o con `+00:00`): lo que pide el esquema. Uno que no se lee es ninguno.
function isoONulo(texto: string | null): string | null {
  if (texto === null) return null
  const ms = Date.parse(texto)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

// Lo que el panel «Compartir» recibe, armado con lo que la ruta leyó (puro): el título que se muestra, el autor, el vehículo (si quien pide lo ve, con la zona de su
// patio y el cierre de su subasta), las cifras de la tarjeta de lo guardado y la zona y el locale de la empresa.
export function datosParaCompartir({
  cotizacion,
  vehiculo,
  subasta,
  autor,
  cifras,
  ajustes,
}: {
  cotizacion: { numero: number; titulo: string | null }
  vehiculo: Vehiculo | null
  subasta: Subasta | null
  autor: string | null
  cifras: Pick<DatosParaCompartir, 'conceptos' | 'total' | 'modo'>
  ajustes: { zonaHoraria: string; locale: string }
}): DatosParaCompartir {
  const titulo = tituloDeLaCotizacion({
    titulo: cotizacion.titulo,
    vehiculo: vehiculo?.titulo ?? null,
    numero: cotizacion.numero,
  }) ?? { texto: `Cotización n.º ${String(cotizacion.numero)}`, fuente: 'numero' as const }
  return {
    numero: cotizacion.numero,
    titulo,
    autor,
    vehiculo:
      vehiculo === null
        ? null
        : {
            titulo: vehiculo.titulo,
            lote: vehiculo.lote,
            anio: vehiculo.anio,
            kilometraje: vehiculo.kilometraje,
            vin: vehiculo.vin,
            enlace: enlaceParaCompartir(vehiculo.urlOrigen),
            cierre: isoONulo(subasta?.subastaFinEn ?? subasta?.subastaEn ?? null),
            zonaDelPatio: zonaDelPatioDe(vehiculo),
            hayFotos: vehiculo.portadaRuta !== null,
          },
    ...cifras,
    zonaDeLaEmpresa: ajustes.zonaHoraria,
    locale: ajustes.locale,
  }
}
