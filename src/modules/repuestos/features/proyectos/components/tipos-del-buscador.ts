import type { ReactNode } from 'react'
import type { Elegido } from '../../../entities/proyectos/cliente-del-formulario'

// Lo que recibe un buscador que arma `src/app`: `repuestos` no importa `buscador` (8.09-1, C10). `elige`: el `data-elige` del campo, adonde vuelve el foco al cerrar
// el alta de lead abierta desde él.
export type PropsDeBuscadorDeProyecto = {
  valor: Elegido | null
  alElegir: (elegido: Elegido | null) => void
  etiqueta: string
  error?: string
  disabled?: boolean
  elige?: string
}

export type BuscadorDeProyecto = (props: PropsDeBuscadorDeProyecto) => ReactNode
