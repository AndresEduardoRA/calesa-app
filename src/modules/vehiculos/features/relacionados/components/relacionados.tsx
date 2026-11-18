'use client'

import type { ReactNode } from 'react'
import type {
  AccionDeRelacionados,
  ContextoDeAcciones,
} from '../../../entities/acciones-de-relacionados'
import type {
  GrupoDeRelacionados,
  GruposDeRelacionados,
  PresentacionDeRelacionados,
} from '../../../entities/relacionados'
import { RelacionadosCompactos } from './relacionados-compactos'
import { RelacionadosEnLinea } from './relacionados-en-linea'
import type { VerTodosDeUnGrupo } from './ver-todos-del-grupo'

type Props<Contraparte> = {
  grupos: GruposDeRelacionados<Contraparte>
  contexto: ContextoDeAcciones
  enCurso: boolean
  alElegir: (accion: AccionDeRelacionados) => void
  // Las filas de un grupo (`<li>`), armadas por quien conoce a la contraparte.
  filasDe: (grupo: GrupoDeRelacionados<Contraparte>) => ReactNode
  // «Ver todos» de un grupo: hay más que ver (el vínculo anterior de un vehículo, o más filas) y a dónde lleva; null = nada más.
  verTodosDe: (grupo: GrupoDeRelacionados<Contraparte>) => VerTodosDeUnGrupo | null
  // `'linea'`: un chip por grupo con su popover (logística). `'compacta'`: los grupos con sus filas (las fichas).
  presentacion: PresentacionDeRelacionados
}

// El bloque «Relacionados»: Vinculado, Interesado y, con `cotizaciones.ver`, Cotizado; un grupo sin nada no se dibuja. Cada lugar dice cómo se ve; los datos, las acciones y las filas las
// pone quien lo usa.
export function Relacionados<Contraparte>({ presentacion, ...props }: Props<Contraparte>) {
  return presentacion === 'compacta' ? (
    <RelacionadosCompactos {...props} />
  ) : (
    <RelacionadosEnLinea {...props} />
  )
}
