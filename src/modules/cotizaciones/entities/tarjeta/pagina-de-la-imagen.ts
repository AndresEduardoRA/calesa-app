// Lo que la imagen de la tarjeta de una guardada sabe de la página, como lo arman la página y la ruta del PDF: el título guardado (sin el de respaldo «Cotización
// n.º N»), el cliente, el vehículo y el asesor de quien la pide, el número, el vencimiento, el último guardado (el texto de la base, sin pasar por `Date`) y el
// nombre y el logo de la empresa. Sin I/O.
import type { HojaDeUnaGuardada } from '../hoja-de-una-guardada'
import { tituloAparteDelNumero, tituloDeLaCotizacion } from '../titulo-de-la-cotizacion'
import type { ContextoDeLaCotizacion, PaginaDeLaTarjeta } from './contexto-de-la-cotizacion'

// Lo que dibuja la tarjeta de una guardada y no sale de la fórmula, de lo que ve quien pide la imagen: el cliente (sólo con `leads.ver`), el vehículo y el asesor
// (quien pide), ya como los nombra la tarjeta. Lo arma `src/app`.
export type ContextoDeQuienMira = Pick<ContextoDeLaCotizacion, 'cliente' | 'vehiculo' | 'asesor'>

export function paginaDeLaImagen({
  hoja,
  contexto,
  empresa,
  logo,
}: {
  hoja: Pick<HojaDeUnaGuardada, 'cotizacion' | 'venceEl'>
  contexto: ContextoDeQuienMira
  empresa: PaginaDeLaTarjeta['empresa']
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
    empresa,
    logo,
  }
}
