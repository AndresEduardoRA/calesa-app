// Lo que se hace con el contexto de la cotización (`entities/contexto-de-la-cotizacion.ts`): el valor de cada variable de una celda y el contexto armado desde lo
// que sabe la página, con las fechas en la zona de la empresa.
import { formatearFecha, inicioDelDia } from '@/shared/lib/fechas'
import type { ContextoDeLaCotizacion } from '../contexto-de-la-cotizacion'
import type { VariableDeLaTarjeta } from '../cuadricula-de-la-tarjeta'

// El tipo vive en el núcleo (lo nombra también la referencia del editor de la plantilla); aquí, lo que se hace con él.
export type { ContextoDeLaCotizacion }

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
    empresa_nombre: contexto.empresa,
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
  // El nombre de la empresa.
  empresa: string | null
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
    empresa: pagina.empresa,
    logo: pagina.logo,
  }
}
