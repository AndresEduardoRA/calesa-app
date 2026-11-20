// Las ventanas de «Subasta» que cuentan desde ahora («Cierra hoy», «Cierra en 48 h», «Cierra esta semana»): el intervalo `[desde, hasta)` del cierre, en instantes
// ISO. «Hoy» y «esta semana» (lunes a domingo) son los de la zona de la empresa. Las tres empiezan ahora: una subasta que ya cerró no «cierra hoy» (el job que
// la pasa a «Sin resolver» corre con hasta 10 minutos de desfase). La página las calcula una vez por pedido; la base sólo compara (`cierre_entre`).
import { diaEnZona, diaSiguiente, inicioDelDia, sumarDias } from '@/shared/lib/fechas'

export const VENTANAS_DEL_CIERRE = ['hoy', '48h', 'semana'] as const

export type VentanaDelCierre = (typeof VENTANAS_DEL_CIERRE)[number]

export type IntervaloDelCierre = { desde: string; hasta: string }

const HORAS_48 = 48 * 60 * 60 * 1000

export function esVentanaDelCierre(valor: string): valor is VentanaDelCierre {
  return (VENTANAS_DEL_CIERRE as readonly string[]).includes(valor)
}

export function ventanaDelCierre(
  ventana: VentanaDelCierre,
  ahora: string,
  zona: string,
): IntervaloDelCierre {
  const instante = Date.parse(ahora)
  const desde = new Date(instante).toISOString()
  if (ventana === '48h') {
    return { desde, hasta: new Date(instante + HORAS_48).toISOString() }
  }
  const hoy = diaEnZona(desde, { zona })
  if (ventana === 'hoy') {
    return { desde, hasta: inicioDelDia(diaSiguiente(hoy), { zona }) }
  }
  // El día de la semana de un día del calendario (sin zona: `YYYY-MM-DD` a medianoche UTC). La semana termina el domingo: el lunes siguiente empieza otra.
  const diaDeLaSemana = new Date(`${hoy}T00:00:00Z`).getUTCDay()
  const hastaElLunes = diaDeLaSemana === 0 ? 1 : 8 - diaDeLaSemana
  return { desde, hasta: inicioDelDia(sumarDias(hoy, hastaElLunes), { zona }) }
}
