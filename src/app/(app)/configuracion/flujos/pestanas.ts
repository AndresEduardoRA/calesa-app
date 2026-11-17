// Las secciones de Configuración › Flujos y quién ve cada una. «Fases» es la pantalla (el diagrama o la lista); las demás («Documentos», «Reglas») se abren
// en el panel del flujo desde su barra (`?seccion=documentos|reglas`, `PANELES_DE_<ÁREA>`). Quien no ve «Fases» (sólo los catálogos de logística) ve su
// sección en la página. Cada área suma las suyas en su carpeta (`PESTANAS_DE_<ÁREA>`) y se juntan abajo, así este archivo no se vuelve a editar.
import type { ReactNode } from 'react'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import type { AlMenosUna } from '../empresa/pestanas'
import { PESTANAS_DE_DOCUMENTOS } from './documentos/pestanas'
import { PESTANAS_DE_FASES } from './fases/pestanas'
import { PESTANAS_DE_REGLAS } from './reglas/pestanas'
import { PESTANAS_DE_REQUISITOS } from './requisitos/pestanas'

export type PestanaDeFlujos = {
  clave: string
  titulo: string
  permisos: readonly ClavePermiso[]
}

// Lo que cada pestaña recibe de la página para dibujar su sección.
export type PedidoDeFlujos = {
  permisos: Permisos
  // `?origen=` y `?ambito=`: el flujo que pide la URL.
  origenPedido: string | undefined
  ambitoPedido: string | undefined
}

export type SeccionDeFlujos = (pedido: PedidoDeFlujos) => ReactNode

// Una sección que se abre en el panel del flujo: su título, lo que dibuja cuando la URL la pide y el esqueleto mientras no.
export type PanelDeFlujos = {
  titulo: string
  contenido: SeccionDeFlujos
  esqueleto: () => ReactNode
}

export const PESTANAS: readonly PestanaDeFlujos[] = [
  { clave: 'fases', titulo: 'Fases', permisos: ['flujos.configurar', 'repuestos.configurar'] },
  ...PESTANAS_DE_FASES,
  ...PESTANAS_DE_REQUISITOS,
  ...PESTANAS_DE_DOCUMENTOS,
  ...PESTANAS_DE_REGLAS,
]

// Las secciones que esta persona puede abrir, en su orden.
export function pestanasVisibles(permisos: Permisos): PestanaDeFlujos[] {
  return PESTANAS.filter((pestana) => pestana.permisos.some((clave) => puede(permisos, clave)))
}

// Lo que viene en la URL lo puede escribir cualquiera: lo que no es una sección visible abre la primera visible.
export function pestanaDe(
  valor: string | undefined,
  visibles: AlMenosUna<{ clave: string }>,
): string {
  return visibles.find((pestana) => pestana.clave === valor)?.clave ?? visibles[0].clave
}
