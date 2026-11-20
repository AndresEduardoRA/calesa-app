// El cursor del orden «Cierre más próximo»: la página camina por tramos (0, las vivas con fecha por su cierre; 1, las vivas sin fecha por alta; 2, las
// demás por alta) y el cursor dice en cuál está su fila. Viaja como `<tramo>~<cursor de siempre>`, cuyo instante es el cierre en el tramo 0 y el alta en
// los otros. `~` no está en base64url: un cursor de «Más recientes» no se lee acá ni uno de acá allá (cae a la primera página).
// `tramoDelCierre` es la copia del `case` de `_vehiculos_inventario_sql()` (el `order by` de afuera y las ramas por tramo): si se separan, el cursor salta
// filas. Las atan `supabase/tests/areas/vehiculos/inventario-orden-cierre.sql` y `e2e/vehiculos-filtro-situacion.spec.ts`.
import {
  armarPaginaPor,
  codificarCursor,
  leerCursor,
  type Cursor,
  type Pagina,
} from '@/shared/lib/paginacion'
import type { Situacion } from './situacion'

export const TRAMOS_DEL_CIERRE = [0, 1, 2] as const

export type TramoDelCierre = (typeof TRAMOS_DEL_CIERRE)[number]

export type CursorDelCierre = Cursor & { tramo: TramoDelCierre }

type FilaDelCierre = {
  id: string
  creadoEn: string
  situacion: Situacion
  cierreSubastaEn: string | null
}

// Una clave de orden, no una situación: viva con fecha, viva sin fecha, o cualquier otra.
export function tramoDelCierre(
  fila: Pick<FilaDelCierre, 'situacion' | 'cierreSubastaEn'>,
): TramoDelCierre {
  if (fila.situacion !== 'en_subasta') return 2
  return fila.cierreSubastaEn === null ? 1 : 0
}

// El instante que lleva el cursor de esa fila: lo que la ordena dentro de su tramo.
function instanteDelCierre(fila: FilaDelCierre): string {
  return tramoDelCierre(fila) === 0 && fila.cierreSubastaEn !== null
    ? fila.cierreSubastaEn
    : fila.creadoEn
}

export function codificarCursorDelCierre(cursor: CursorDelCierre): string {
  return `${cursor.tramo}~${codificarCursor(cursor)}`
}

export function leerCursorDelCierre(texto: string | null | undefined): CursorDelCierre | null {
  const partes = texto ? /^([012])~(.+)$/.exec(texto) : null
  if (!partes) return null
  const cursor = leerCursor(partes[2])
  return cursor ? { ...cursor, tramo: Number(partes[1]) as TramoDelCierre } : null
}

// La página del orden por cierre, de lo que devolvió la base (`tamano + 1` filas, en su orden: al revés si se fue hacia atrás). Cada lado lleva el tramo
// de la fila de su borde.
export function armarPaginaDelCierre<Fila extends FilaDelCierre>(
  leidas: readonly Fila[],
  tamano: number,
  cursor: Cursor | null,
): Pagina<Fila> {
  const pagina = armarPaginaPor(leidas, tamano, cursor, instanteDelCierre)
  const conTramo = (texto: string | null, fila: Fila | undefined) =>
    texto === null || fila === undefined ? null : `${tramoDelCierre(fila)}~${texto}`
  return {
    filas: pagina.filas,
    siguiente: conTramo(pagina.siguiente, pagina.filas.at(-1)),
    anterior: conTramo(pagina.anterior, pagina.filas[0]),
  }
}
