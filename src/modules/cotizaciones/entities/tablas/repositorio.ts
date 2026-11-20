// La escritura de las tablas de referencia (4.23-2; docs/COTIZADOR.md › «Crear, columnas y desactivar»): la une `areas/tablas/composicion.ts` con
// `infra/tablas/publicacion.ts` y `infra/tablas/estructura.ts`, y la usan las actions de `features/tablas/`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { ColumnaDeTabla } from '../tabla-de-ayuda'
import type { PedidoDePublicarTabla, PublicacionDeTabla } from './publicacion'
import type { ColumnasCambiadas, TablaCreada, TablaDesactivada } from './resultado-de-estructura'

// `id` es el intento (uno por apertura del panel: repetirlo devuelve la misma tabla); `origenId` nulo crea una compartida.
export type PedidoDeCrearTabla = {
  id: string
  origenId: string | null
  nombre: string
  columnas: ColumnaDeTabla[]
}

// La lista entera de columnas en su orden y la versión que se leyó.
export type PedidoDeCambiarColumnas = {
  tablaId: string
  columnas: ColumnaDeTabla[]
  versionEsperada: number
}

export type PedidoDeDesactivarTabla = { tablaId: string; versionEsperada: number }

export type RepositorioDeTablas = {
  publicar: (pedido: PedidoDePublicarTabla) => Promise<ResultadoDeAccion<PublicacionDeTabla>>
  crear: (pedido: PedidoDeCrearTabla) => Promise<ResultadoDeAccion<TablaCreada>>
  cambiarColumnas: (
    pedido: PedidoDeCambiarColumnas,
  ) => Promise<ResultadoDeAccion<ColumnasCambiadas>>
  desactivar: (pedido: PedidoDeDesactivarTabla) => Promise<ResultadoDeAccion<TablaDesactivada>>
}
