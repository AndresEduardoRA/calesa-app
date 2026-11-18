// Lo que la portada de una guardada sabe de la página, como lo arman la página y la ruta del PDF: el título guardado (sin el de respaldo «Cotización n.º N»), el
// cliente, el vehículo y el asesor del contexto (el de la compartida o el de quien pide), el número, el vencimiento, el último guardado (el texto de la base, sin
// pasar por `Date`) y el logo. Sin I/O.
import type { HojaDeUnaGuardada } from '../hoja-de-una-guardada'
import { tituloAparteDelNumero, tituloDeLaCotizacion } from '../titulo-de-la-cotizacion'
import type { PaginaDeLaTarjeta } from './contexto-de-la-cotizacion'
import type { ContextoCompartido } from './portada'

export function paginaDeLaPortada({
  hoja,
  contexto,
  logo,
}: {
  hoja: Pick<HojaDeUnaGuardada, 'cotizacion' | 'venceEl'>
  contexto: ContextoCompartido
  logo: PaginaDeLaTarjeta['logo']
}): PaginaDeLaTarjeta {
  const { cotizacion } = hoja
  return {
    titulo: tituloAparteDelNumero(
      tituloDeLaCotizacion({
        titulo: cotizacion.titulo,
        vehiculo: contexto.vehiculo?.titulo ?? null,
        numero: cotizacion.numero,
      }),
    ),
    cliente: contexto.cliente,
    vehiculo: contexto.vehiculo,
    asesor: contexto.asesor,
    numero: cotizacion.numero,
    venceEl: hoja.venceEl,
    guardadaEl: cotizacion.actualizadoEn,
    logo,
  }
}
