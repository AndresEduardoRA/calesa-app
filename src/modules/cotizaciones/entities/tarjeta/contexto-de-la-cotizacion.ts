// Lo de la cotización que la tarjeta muestra y no es un nodo de la fórmula: las variables de una celda (`fecha_larga`, `numero`, `asesor_nombre`…). Llega ya
// formateado por quien arma la página (la fecha en la zona de la empresa), o nulo: una variable sin valor se dibuja vacía (D8 de T310).
import { formatearFecha, inicioDelDia } from '@/shared/lib/fechas'
import type { VariableDeLaTarjeta } from '../cuadricula-de-la-tarjeta'

export type ContextoDeLaCotizacion = {
  // «6 nov 2026»: el día de hoy en la hoja nueva y el del último guardado en una guardada.
  fecha: string
  // El número pelado de una guardada; nulo en la hoja nueva.
  numero: string | null
  // El título de la cotización.
  titulo: string | null
  asesor: string | null
  // El nombre del cliente, sólo si quien arma la página lo ve.
  cliente: string | null
  vehiculo: { titulo: string; lote: string | null; vin: string | null } | null
  // «20 nov 2026»: el día en que vence; nulo sin vencimiento.
  venceEl: string | null
  // El logo de la empresa, si tiene uno.
  logo: { nombre: string; url: string } | null
}

// Las iniciales de las dos primeras palabras, en mayúsculas: «Ana María López» → «AM».
export function inicialesDe(nombre: string | null): string {
  if (nombre === null) return ''
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => [...palabra][0] ?? '')
    .join('')
    .toLocaleUpperCase('es')
}

// Lo que dice una variable con este contexto, más lo que sale del cálculo (el título de la opción elegida y el nombre del modo elegido). Vacío sin valor.
export function valorDeLaVariable(
  variable: string,
  contexto: ContextoDeLaCotizacion,
  delCalculo: { tituloOpcion: string | null; modo: string | null },
): string {
  const valores: Record<VariableDeLaTarjeta, string | null | undefined> = {
    fecha_larga: contexto.fecha,
    numero: contexto.numero,
    titulo: contexto.titulo,
    titulo_opcion: delCalculo.tituloOpcion,
    asesor_nombre: contexto.asesor,
    asesor_iniciales: inicialesDe(contexto.asesor),
    cliente_nombre: contexto.cliente,
    vehiculo_titulo: contexto.vehiculo?.titulo,
    vehiculo_lote: contexto.vehiculo?.lote,
    vehiculo_vin: contexto.vehiculo?.vin,
    vence_el: contexto.venceEl,
    modo_tc: delCalculo.modo,
  }
  return (Object.hasOwn(valores, variable) ? valores[variable as VariableDeLaTarjeta] : null) ?? ''
}

// Lo que la página sabe de la cotización, sin formatear: lo pasan la hoja nueva y la guardada a `<ProveedorDeLaTarjeta>`, y la ruta del PDF.
export type PaginaDeLaTarjeta = {
  titulo: string | null
  cliente: string | null
  vehiculo: ContextoDeLaCotizacion['vehiculo']
  asesor: string | null
  numero: number | null
  // El último día en que vale (`YYYY-MM-DD` de la zona de la empresa) de una guardada; nulo en la hoja nueva.
  venceEl: string | null
  // El último guardado (el texto de la base) de una guardada; nulo en la hoja nueva, que dice hoy.
  guardadaEl: string | null
  logo: ContextoDeLaCotizacion['logo']
}

// El contexto con las fechas en la zona de la empresa (D8): la del último guardado o la de hoy, y el día del vencimiento.
export function contextoDeLaPagina(
  pagina: PaginaDeLaTarjeta,
  { zona, hoy }: { zona: string; hoy: string },
): ContextoDeLaCotizacion {
  return {
    fecha: formatearFecha(pagina.guardadaEl ?? hoy, { zona }),
    numero: pagina.numero === null ? null : String(pagina.numero),
    titulo: pagina.titulo,
    asesor: pagina.asesor,
    cliente: pagina.cliente,
    vehiculo: pagina.vehiculo,
    venceEl:
      pagina.venceEl === null
        ? null
        : formatearFecha(inicioDelDia(pagina.venceEl, { zona }), { zona }),
    logo: pagina.logo,
  }
}
