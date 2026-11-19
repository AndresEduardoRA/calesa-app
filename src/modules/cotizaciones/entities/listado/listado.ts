import type { Cursor, Pagina } from '@/shared/lib/paginacion'
import type { Database } from '@/shared/types/database.types'

// El máximo de filas (o grupos) por página del listado `/cotizaciones` (el selector ofrece hasta acá), el mismo en tabla y en tarjetas, agrupada o no (la vista cambia
// en el cliente sin releer): con la tarjeta de la lista (su portada y sus filas) 100 no caben en los nodos ni en los bytes del listado (`docs/RENDIMIENTO.md`), como en
// leads. La base admite hasta 100 en `cotizaciones_listado()` y `cotizaciones_buscar()` (medido con 250.000 en `supabase/tests/medir-cotizaciones-listado.sql`) y da
// este sin pedido; `cotizaciones_listado_por_vehiculo()`, hasta este.
export const MAXIMO_DE_PAGINA_DE_COTIZACIONES = 50

// La búsqueda nombra a lo sumo tanto clientes, vehículos y personas (el más nuevo primero): `cotizaciones_buscar()` lo escribe igual en `v_tope`. Si una fuente se pasa, la
// página lo dice (`acotada`) y el listado pide afinar la búsqueda: no se nombra a todos los «García» de la empresa.
export const TOPE_DE_COINCIDENCIAS = 50

export type ClaseDeCotizacion = Database['public']['Enums']['clase_cotizacion']
export type EstadoDeCotizacion = Database['public']['Enums']['estado_cotizacion']

// Lo que pide una página del listado: cada filtro achica lo que quien mira ve (la RLS decide). «Mías» son las que creó quien mira (P1 del 4.16-1).
export type PedidoDelListado = {
  origenId?: string
  clase?: ClaseDeCotizacion
  mias?: boolean
  // Las de un vehículo: el camino a lo antiguo del historial del vehículo, tras sus 500.
  vehiculoId?: string
  // Las de un lead: el camino a lo antiguo de la sección «Cotizaciones» de su ficha, tras sus 500 (4.17-4b).
  leadId?: string
  // Lo que se busca (número, título, cliente, vehículo o autor), ya con el mínimo cumplido: sin él, el listado de siempre.
  texto?: string
  cursor: Cursor | null
  tamano: number
}

// Una fila del listado, sin el snapshot. Los nombres del lead, del vehículo y del autor los lee la pantalla sobre la página.
export type FilaDelListado = {
  id: string
  numero: number
  origenId: string
  leadId: string | null
  vehiculoId: string | null
  creadoPor: string
  clase: ClaseDeCotizacion
  estado: EstadoDeCotizacion
  titulo: string | null
  totalBase: number
  monedaMostrar: string | null
  // El texto de la base, con sus microsegundos: es lo que lleva el cursor.
  creadoEn: string
  // La fecha (AAAA-MM-DD) hasta la que vale, por día en la zona de la empresa; `vencida` si ya pasó.
  venceEl: string
  vencida: boolean
}

// Una página del listado: con búsqueda, `acotada` dice que alguna fuente (clientes, vehículos o personas) tenía más coincidencias que el tope y quedaron fuera las más viejas.
export type PaginaDelListado = Pagina<FilaDelListado> & { acotada: boolean }
