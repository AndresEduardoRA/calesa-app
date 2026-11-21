import type { ReactNode } from 'react'
import type { DatosDeLaTarjeta } from '../../../entities/tarjetas-de-la-ficha'

// Lo que la fila de tarjetas de una ficha necesita de quien lee las cotizaciones, igual para el lead (el listado) y el vehículo (`aprobada`): el listado la dibuja y `aprobada` se la
// pide por hueco, porque un área no importa otra.
export type PropsDeLasTarjetasDeLaFicha = {
  // Qué lista es, para quien la lee en voz alta («Cotizaciones del lead»).
  etiqueta: string
  // Lo que dice el error de la primera lectura.
  tituloDelError: string
  // Cómo va la primera lectura: sin leer (esqueleto), fallida (error con «Reintentar») o leída.
  lectura: { leida: boolean; fallo: boolean; alReintentar: () => void }
  filas: readonly DatosDeLaTarjeta[]
  // A dónde lleva la última tarjeta, «Ver más» (el listado filtrado); nulo si no hay más que ver.
  verMas: string | null
  // Lo que suma cada tarjeta además de abrir el resumen y compartir (la casilla de «Comparar» y «Aprobar esta» del vehículo).
  porTarjeta?: (id: string) => { casilla: ReactNode; aprobar: ReactNode }
}
