// Las tarjetas de «Ajustes» del sitio y los campos de texto que cada una edita en su modal (`?panel=<tarjeta>`). La vitrina (orígenes e interruptor) no es
// de texto: la lleva su modal.
import type { EntradaDeCambios } from './ajustes'
import { REDES_DEL_SITIO } from './ajustes'

export type CampoDeTexto = Exclude<
  keyof EntradaDeCambios,
  'mostrarMonedaSecundaria' | 'origenesVisibles'
>

export const TARJETAS_DE_TEXTO = ['identidad', 'contacto', 'redes', 'seo'] as const
export type TarjetaDeTexto = (typeof TARJETAS_DE_TEXTO)[number]
export type TarjetaDelSitio = TarjetaDeTexto | 'vitrina'

export const CAMPOS_DE_LA_TARJETA: Record<TarjetaDeTexto, readonly CampoDeTexto[]> = {
  identidad: ['nombreSitio', 'lema'],
  contacto: ['whatsappRespaldo', 'horario', 'direccionPublica'],
  redes: REDES_DEL_SITIO,
  seo: ['seoTitulo', 'seoDescripcion'],
}

export type EscritoDeLaTarjeta = Partial<Record<CampoDeTexto, string>>

// Lo que la tarjeta parte de lo guardado: sus campos de texto.
export function escritoInicial(
  tarjeta: TarjetaDeTexto,
  guardado: EntradaDeCambios,
): Record<string, string> {
  return Object.fromEntries(CAMPOS_DE_LA_TARJETA[tarjeta].map((campo) => [campo, guardado[campo]]))
}

// Si algo de lo escrito difiere de lo guardado (los espacios de los bordes no cuentan: al guardar se recortan).
export function hayCambiosDeTexto(
  tarjeta: TarjetaDeTexto,
  guardado: EntradaDeCambios,
  escrito: Record<string, string>,
): boolean {
  return CAMPOS_DE_LA_TARJETA[tarjeta].some(
    (campo) => (escrito[campo] ?? '').trim() !== guardado[campo].trim(),
  )
}

// Sólo la dirección sin el esquema, para que quepa en la tarjeta: «instagram.com/autos-del-sur».
export function direccionCorta(direccion: string): string {
  return direccion.replace(/^https:\/\//, '').replace(/\/$/, '')
}
