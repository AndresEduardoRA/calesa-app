// La lista de cotizaciones agrupada por vehículo (`docs/UX.md` › «Cotizaciones», `docs/GLOSARIO.md` › «Grupo de un vehículo»): una entrada por vehículo (el grupo,
// representado por su cabeza) o por cotización sin vehículo (la suelta). Puro: la página decide si agrupa, la base arma los grupos
// (`cotizaciones_listado_por_vehiculo()`) y, con una búsqueda, esto agrupa la página que ya llegó.
import { z } from 'zod'
import { conteoAcotado, conteoCorto, type ConteoAcotado } from '@/shared/lib/conteo'
import { TOPE_DE_ESTE_VEHICULO, type Cursor, type Pagina } from '@/shared/lib/paginacion'
import type { FilaDelListado, PedidoDelListado } from './listado'

// `?agrupar=no` apaga la agrupación para esa vista y `?agrupar=si` la enciende aunque la persona la haya apagado (lo escribe «Agrupar por vehículo»).
export const CLAVE_DE_AGRUPAR = 'agrupar'
export const VALORES_DE_AGRUPAR = ['si', 'no'] as const
export type ValorDeAgrupar = (typeof VALORES_DE_AGRUPAR)[number]

// Una entrada de la lista: un grupo (las cotizaciones de un vehículo que quien mira ve y coinciden) o una suelta. `ordenEn` y `ordenId` son la cotización más
// reciente del grupo (la de la suelta, ella misma): por ahí se ordena y por ahí va el cursor. La `cabeza` es la que representa al grupo en la tarjeta o la fila:
// su aprobada si quien mira la ve y coincide; si no, la más reciente.
export type EntradaDelListado<F> =
  | { tipo: 'suelta'; ordenEn: string; ordenId: string; cotizacion: F }
  | {
      tipo: 'grupo'
      ordenEn: string
      ordenId: string
      vehiculoId: string
      cabeza: F
      // Cuántas suyas coinciden (con la cabeza), hasta `TOPE_DE_ESTE_VEHICULO` («100+»).
      conteo: ConteoAcotado
    }

// Una página de la lista agrupada. `cortada`: la base recorrió su tope sin completar la página (el cursor codificado de dónde siguió, para «Seguir buscando»).
export type PaginaAgrupada<F> = Pagina<EntradaDelListado<F>> & { cortada: string | null }

// Lo que pide el modal de un grupo: las del vehículo con los mismos filtros (y la búsqueda) de la página, por cursor.
export type PedidoDelGrupo = Pick<
  PedidoDelListado,
  'origenId' | 'clase' | 'mias' | 'leadId' | 'texto'
> & {
  vehiculoId: string
  cursor: Cursor | null
}

// Una cotización del modal de un grupo: la fila del listado con quién la hizo y el nombre de su modo de tipo de cambio (nulo si no tiene o no se leyó); la línea no
// lleva cliente ni «⋯».
export type LineaDelGrupo = FilaDelListado & { autor: string; modo: string | null }

// El modal de las cotizaciones de un vehículo de la lista agrupada vive en la URL: `?panel=cotizaciones-del-vehiculo&vehiculo=<id>`. Mientras ese panel está abierto, `?vehiculo=` es
// del modal y no el filtro del listado (la página no lo lee como filtro: la lista de atrás sigue agrupada).
export const PANEL_DE_COTIZACIONES_DEL_VEHICULO = 'cotizaciones-del-vehiculo'

// Lo que se dice si el enlace nombra un vehículo que no es un id.
export const MENSAJE_DEL_VEHICULO_NO_VALIDO = 'Ese enlace no nombra un vehículo.'

const ES_GUID = z.guid()

// El id del vehículo de `?vehiculo=`, en minúsculas, o null si no es un guid (o no hay): la única lectura de esa clave para el modal.
export function idDelVehiculoDelModal(texto: string | null | undefined): string | null {
  return texto === null || texto === undefined || !ES_GUID.safeParse(texto).success
    ? null
    : texto.toLowerCase()
}

// El título del modal: «Cotizaciones de <vehículo>»; sin su nombre (quien mira no ve vehículos o el grupo no está en la página), «Cotizaciones de este vehículo».
export function tituloDelModalDelGrupo(vehiculo: string | null | undefined): string {
  const nombre = vehiculo?.trim() ?? ''
  return nombre === '' ? 'Cotizaciones de este vehículo' : `Cotizaciones de ${nombre}`
}

// Si la lista se agrupa: con `?vehiculo=` (las de un solo vehículo) nunca; si la URL lo dice, lo que dice; si no, la preferencia de la persona; sin elegir, sí.
export function agruparDelListado({
  pedida,
  preferida,
  vehiculo,
}: {
  pedida: string | null | undefined
  preferida: boolean | null
  vehiculo: boolean
}): boolean {
  if (vehiculo) {
    return false
  }
  if (pedida === 'no') {
    return false
  }
  if (pedida === 'si') {
    return true
  }
  return preferida ?? true
}

// La cotización que representa una entrada (la de la tarjeta o la fila).
export function cotizacionDeLaEntrada<F>(entrada: EntradaDelListado<F>): F {
  return entrada.tipo === 'grupo' ? entrada.cabeza : entrada.cotizacion
}

// Con una búsqueda la base no agrupa: se agrupa la página que llegó (en su orden). Un grupo va donde aparece su primera (la más reciente) y junta las de esa
// página de su vehículo; su cabeza es la aprobada si está entre ellas, si no la primera; su conteo, cuántas de la página son suyas.
export function agruparLaPagina<
  F extends { id: string; vehiculoId: string | null; creadoEn: string },
>(filas: readonly F[], aprobadas: ReadonlySet<string>): EntradaDelListado<F>[] {
  const porVehiculo = new Map<string, F[]>()
  for (const fila of filas) {
    if (fila.vehiculoId !== null) {
      porVehiculo.set(fila.vehiculoId, [...(porVehiculo.get(fila.vehiculoId) ?? []), fila])
    }
  }
  const entradas: EntradaDelListado<F>[] = []
  for (const fila of filas) {
    if (fila.vehiculoId === null) {
      entradas.push({ tipo: 'suelta', ordenEn: fila.creadoEn, ordenId: fila.id, cotizacion: fila })
      continue
    }
    const delVehiculo = porVehiculo.get(fila.vehiculoId) ?? [fila]
    if (delVehiculo[0] !== fila) {
      continue
    }
    entradas.push({
      tipo: 'grupo',
      ordenEn: fila.creadoEn,
      ordenId: fila.id,
      vehiculoId: fila.vehiculoId,
      cabeza: delVehiculo.find((una) => aprobadas.has(una.id)) ?? fila,
      conteo: conteoAcotado(delVehiculo.length, TOPE_DE_ESTE_VEHICULO),
    })
  }
  return entradas
}

// «3 cotizaciones de este vehículo» o «100+ cotizaciones de este vehículo»; con una sola, nada (no hay qué abrir).
export function textoDelConteo(conteo: ConteoAcotado): string | null {
  if (!conteo.hayMas && conteo.n <= 1) {
    return null
  }
  return `${conteoCorto(conteo)} cotizaciones de este vehículo`
}

// El conteo que manda la base (`grupo_n`, leído con `limit 101`) como conteo acotado.
export function conteoDelGrupo(leidas: number): ConteoAcotado {
  return conteoAcotado(leidas, TOPE_DE_ESTE_VEHICULO)
}

// La cabeza de un grupo ya no vale si la primera página de su modal (las del vehículo que coinciden, de la más nueva a la más vieja) no empieza por la
// cotización por la que se ordenó: se envió a la papelera, se invalidó o llegó una más nueva mientras se miraba. Entonces se relee la página de grupos.
export function grupoQueCambio(
  grupo: { ordenId: string },
  primeraPagina: readonly { id: string }[],
): boolean {
  return primeraPagina[0]?.id !== grupo.ordenId
}

// Lo que se dibuja en el modal de un grupo: la cabeza primero (su aprobada si quien mira la ve y coincide) y después las demás, en el orden en que llegaron. Sin cabeza
// (el enlace abre un grupo que no está en la página), sólo las leídas.
export function lineasDelGrupo<F extends { id: string }>(
  cabeza: F | null,
  leidas: readonly F[],
): F[] {
  return cabeza === null ? [...leidas] : [cabeza, ...leidas.filter((fila) => fila.id !== cabeza.id)]
}

// `?agrupar=` de la URL: sólo «si» o «no»; otra cosa es como no decir nada.
export function leerAgrupar(texto: string | null | undefined): ValorDeAgrupar | null {
  const leido = z.enum(VALORES_DE_AGRUPAR).safeParse(texto)
  return leido.success ? leido.data : null
}
