import type { PestanaDeCotizacion } from '@/shared/lib/rutas'

// Lo que le falta a un origen para cotizar con la tarjeta, en su tarjeta del inicio de Configuración › Cotización: sin fórmula publicada, la
// fórmula (el paso «Publica la fórmula» de `pasosDe()`, con el mismo texto que la tarjeta de Orígenes); con fórmula y sin plantilla publicada,
// la tarjeta (se arma con los grupos de la fórmula). Cada una enlaza a su pestaña. Un origen inactivo no muestra faltas, como en Orígenes.
export type FaltaDelOrigen = { texto: string; pestana: PestanaDeCotizacion }

export function faltasDelOrigen({
  activo,
  versionDeLaFormula,
  tarjetaPublicada,
}: {
  activo: boolean
  versionDeLaFormula: number | null
  tarjetaPublicada: boolean
}): FaltaDelOrigen[] {
  if (!activo) {
    return []
  }
  if (versionDeLaFormula === null) {
    return [{ texto: 'Falta publicar la fórmula', pestana: 'formula' }]
  }
  return tarjetaPublicada ? [] : [{ texto: 'Falta publicar la tarjeta', pestana: 'tarjeta' }]
}
