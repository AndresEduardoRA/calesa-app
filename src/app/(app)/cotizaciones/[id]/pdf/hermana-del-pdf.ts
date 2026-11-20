import {
  contextoDeLaPagina,
  ladoDeLaOpcion,
  leerHojaDeUnaGuardada,
  type AsesorDeLaTarjeta,
  type HojaDeUnaGuardada,
} from '@/modules/cotizaciones'
import { tituloDeLaTarjeta, vehiculoDeLaTarjeta } from '../../datos-de-la-tarjeta'

type Comun = {
  cliente: string | null
  asesor: AsesorDeLaTarjeta | null
  vehiculo: { titulo: string; lote: string | null; vin: string | null } | null
  empresa: string
  logo: { nombre: string; url: string } | null
  zona: string
}

// La hermana de una cotización en par para su PDF (glosario: «Cotizaciones hermanas»): si está disponible, su lectura y su contexto (su título, número y fechas;
// el cliente, el vehículo y el asesor, quien mira, son los mismos), y si va antes en el orden de las opciones. Sin ella o si no se lee, nada: el PDF lleva sólo la propia.
export async function hermanaDelPdf(hoja: HojaDeUnaGuardada, comun: Comun) {
  if (!hoja.hermana?.disponible) return undefined
  const par = hoja.diseno.par
  if (!par) return undefined
  const lectura = await leerHojaDeUnaGuardada(hoja.hermana.id)
  if (!lectura.ok) return undefined
  const otra = lectura.data.hoja
  const contexto = contextoDeLaPagina(
    {
      titulo: tituloDeLaTarjeta(otra.cotizacion, comun.vehiculo),
      cliente: comun.cliente,
      vehiculo: vehiculoDeLaTarjeta(comun.vehiculo),
      asesor: comun.asesor,
      numero: otra.cotizacion.numero,
      venceEl: otra.venceEl,
      guardadaEl: otra.cotizacion.actualizadoEn,
      empresa: comun.empresa,
      logo: comun.logo,
    },
    { zona: comun.zona, hoy: otra.cotizacion.actualizadoEn },
  )
  const antes =
    (ladoDeLaOpcion(par, otra.opcionDelPar) ?? 1) < (ladoDeLaOpcion(par, hoja.opcionDelPar) ?? 0)
  return { lectura: lectura.data, contexto, antes }
}
