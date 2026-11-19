// Una fila del listado `/cotizaciones` con los nombres que la lectura no trae (cliente, vehículo, autor): la pantalla los lee sobre la página, por clave primaria y con la RLS
// de quien mira, y esto los une. Un nombre que no llegó es nulo y se dibuja «—»: no distingue «sin lead» de «un lead que no ves» (como `/cotizaciones/[id]`).
import type { FilaDelListado } from './listado'

export type CotizacionDelListado = FilaDelListado & {
  cliente: string | null
  vehiculo: string | null
  autor: string
  // Es la cotización aprobada de su vehículo (`cotizaciones_aprobadas`): la insignia «Aprobada».
  aprobada: boolean
  // El nombre de su modo de tipo de cambio (al lado del total en la tarjeta de la lista), o nulo si no tiene o no se leyó.
  modo: string | null
}

export type NombresDelListado = {
  clientes: ReadonlyMap<string, string>
  vehiculos: ReadonlyMap<string, string>
  autores: ReadonlyMap<string, string>
  // Los ids de las cotizaciones de la página que son la aprobada de su vehículo.
  aprobadas: ReadonlySet<string>
  // El nombre del modo de cada una (`cotizaciones_modos_de()`); sin él, ninguna lo dice.
  modos?: ReadonlyMap<string, string>
}

type ClaveDeId = 'leadId' | 'vehiculoId' | 'creadoPor'

// Los ids distintos y no nulos de esa columna, en el orden de la página: lo que se pregunta (nada si no hay).
export function idsDe(filas: readonly FilaDelListado[], columna: ClaveDeId): string[] {
  const ids = new Set<string>()
  for (const fila of filas) {
    const id = fila[columna]
    if (id !== null) {
      ids.add(id)
    }
  }
  return [...ids]
}

export function filasConNombres(
  filas: readonly FilaDelListado[],
  nombres: NombresDelListado,
): CotizacionDelListado[] {
  return filas.map((fila) => ({
    ...fila,
    cliente: fila.leadId === null ? null : (nombres.clientes.get(fila.leadId) ?? null),
    vehiculo: fila.vehiculoId === null ? null : (nombres.vehiculos.get(fila.vehiculoId) ?? null),
    autor: nombres.autores.get(fila.creadoPor) ?? 'Sin nombre',
    aprobada: nombres.aprobadas.has(fila.id),
    modo: nombres.modos?.get(fila.id) ?? null,
  }))
}

// Las filas de una página sin agrupar como entradas de la lista: cada una sola (una `suelta`, aunque tenga vehículo), ordenada por sí misma.
export function entradasSinAgrupar<F extends { id: string; creadoEn: string }>(
  filas: readonly F[],
): { tipo: 'suelta'; ordenEn: string; ordenId: string; cotizacion: F }[] {
  return filas.map((fila) => ({
    tipo: 'suelta',
    ordenEn: fila.creadoEn,
    ordenId: fila.id,
    cotizacion: fila,
  }))
}
