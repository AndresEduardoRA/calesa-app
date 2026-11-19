'use client'

import { createContext, type ReactNode } from 'react'
import type { PropsDeLaVistaPrevia } from './huecos'

// El hueco de la vista previa (4.18-2): el proveedor del área `tarjeta` lo llena con lo que dibuja el modal «Vista previa» (con lo que la página sabe: el asesor, el vehículo, el
// logo). Sin proveedor es nulo y el resumen no dibuja el botón ni monta nada: ni un nodo cambia. El núcleo no importa el área: recibe una función que dibuja.
// `alGuardarLaCotizacion(id)`: lo llama el núcleo cuando una cotización quedó guardada (crear, guardar, cotizar encima), después de responder y sin esperar nada; el área
// pide ahí la portada de la cotización (`docs/COTIZADOR.md` › «La portada de la cotización»). `compartir()`: lo que la cabecera de una guardada dibuja a la vista junto a
// «Guardar» (el botón «Compartir» y su panel); sin él (la hoja nueva), nada.
export type VistaPreviaDeArea = {
  dibujar: (props: PropsDeLaVistaPrevia) => ReactNode
  alGuardarLaCotizacion?: (id: string) => void
  compartir?: () => ReactNode
}

export const ContextoDeLaVistaPrevia = createContext<VistaPreviaDeArea | null>(null)
