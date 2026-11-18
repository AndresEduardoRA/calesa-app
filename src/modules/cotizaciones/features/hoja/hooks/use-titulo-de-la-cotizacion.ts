'use client'

import { createContext, useContext } from 'react'
import type { EstadoDelTitulo } from '../../../entities/titulo-de-la-cotizacion'

// El título de la cotización que se edita (T307), compartido por lo que lo escribe (el campo, dentro del panel del vehículo), lo que lo muestra (la barra, la
// tarjeta) y lo que lo guarda (la hoja). Vive en `<ProveedorDelTitulo>`, que `src/app` pone sobre las barras y la hoja: fuera de la `key` de la hoja, así cambiar de
// vehículo o de cliente no lo pierde.
export type TituloDeLaCotizacion = {
  estado: EstadoDelTitulo
  // Lo guardado (una guardada) o automático (la nueva): contra qué se mide si cambió.
  inicial: EstadoDelTitulo
  // El título del vehículo elegido, el automático; nulo sin vehículo.
  vehiculo: string | null
  // El que se ve: el manual o el del vehículo (`tituloMostrado()`).
  mostrado: string | null
  // Quien mira lo puede escribir (una guardada de sólo lectura, no).
  puede: boolean
  escribir: (texto: string) => void
  // «Escribir el título» pide el foco antes de abrir el panel: el campo lo toma al montarse y lo suelta.
  focoPedido: boolean
  pedirFoco: () => void
  soltarFoco: () => void
  // El rechazo de la base sobre el título (otra pestaña lo vació, o más largo que el tope): se repite debajo del campo.
  rechazo: string | null
  ponerRechazo: (texto: string | null) => void
  // Guardada la cotización: el borrador se va (y la hoja nueva vuelve a automático para la próxima).
  alGuardar: () => void
}

export const ContextoDelTitulo = createContext<TituloDeLaCotizacion | null>(null)

// Nulo fuera de `<ProveedorDelTitulo>` (una prueba de la hoja sin él): la hoja no pide el título.
export function useTituloDeLaCotizacion(): TituloDeLaCotizacion | null {
  return useContext(ContextoDelTitulo)
}
