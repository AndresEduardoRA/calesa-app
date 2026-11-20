import type { FilaDeValores } from '@/shared/ui/tarjetas-de-ajustes'
import {
  ETIQUETA_DE_RED,
  REDES_DEL_SITIO,
  type AjustesDelSitio,
} from '../../../../entities/sitio/ajustes'
import { direccionCorta } from '../../../../entities/sitio/tarjetas-del-sitio'

// Los orígenes que se nombran en la tarjeta antes de «y N más».
const ORIGENES_A_LA_VISTA = 4

export const filasDeIdentidad = (ajustes: AjustesDelSitio): FilaDeValores[] => [
  { etiqueta: 'Nombre', valor: ajustes.nombreSitio },
  { etiqueta: 'Lema', valor: ajustes.lema },
]

export const filasDeContacto = (ajustes: AjustesDelSitio): FilaDeValores[] => [
  { etiqueta: 'WhatsApp de respaldo', valor: ajustes.whatsappRespaldo },
  { etiqueta: 'Horario', valor: ajustes.horario },
  {
    etiqueta: 'Dirección pública',
    valor: ajustes.direccionPublica ? direccionCorta(ajustes.direccionPublica) : null,
  },
]

// Sólo las redes con dirección: las vacías no se muestran en la web.
export const filasDeRedes = (ajustes: AjustesDelSitio): FilaDeValores[] =>
  REDES_DEL_SITIO.flatMap((red) => {
    const direccion = ajustes.redes[red]
    return direccion ? [{ etiqueta: ETIQUETA_DE_RED[red], valor: direccionCorta(direccion) }] : []
  })

export const filasDeSeo = (ajustes: AjustesDelSitio): FilaDeValores[] => [
  { etiqueta: 'Título', valor: ajustes.seo.titulo ?? null },
  { etiqueta: 'Descripción', valor: ajustes.seo.descripcion ?? null },
]

function origenesEnFrase(nombres: readonly string[]): string | null {
  if (nombres.length === 0) {
    return null
  }
  const vistos = nombres.slice(0, ORIGENES_A_LA_VISTA).join(', ')
  const resto = nombres.length - ORIGENES_A_LA_VISTA
  return resto > 0 ? `${vistos} y ${String(resto)} más` : vistos
}

export const filasDeVitrina = (
  ajustes: AjustesDelSitio,
  origenes: readonly { id: string; nombre: string }[],
): FilaDeValores[] => [
  {
    etiqueta: 'Orígenes que se ven',
    valor: origenesEnFrase(
      origenes
        .filter((origen) => ajustes.origenesVisibles.includes(origen.id))
        .map((origen) => origen.nombre),
    ),
    nota: ajustes.origenesVisibles.length === 0 ? 'La web no muestra vehículos.' : undefined,
  },
  {
    etiqueta: 'Moneda secundaria',
    valor: ajustes.mostrarMonedaSecundaria ? 'Se muestra' : 'No se muestra',
  },
]
