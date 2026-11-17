// Monedas y tipos de cambio nombrados (oficial, paralelo…). Hay un solo valor vigente por clave:
// cambiarlo pisa el anterior y el historial lo guarda un trigger. Las cotizaciones guardadas no
// se mueven: cada una congeló los que usó.
import { avisoDeNumero, leerNumeroTipeado } from '@/shared/lib/numero-tipeado'
import type { Tables } from '@/shared/types/database.types'
import { formatearParaEditar } from '@/shared/lib/formato'

export type Moneda = {
  codigo: string
  nombre: string
  simbolo: string
  decimales: number
  activa: boolean
  // ISO. La versión de la moneda.
  actualizadoEn: string
}

export type TipoCambio = {
  id: string
  // Como lo nombran las fórmulas («oficial»). No cambia después de crearlo.
  clave: string
  nombre: string
  // Una unidad de `monedaDe` vale `valor` de `monedaA`.
  monedaDe: string
  monedaA: string
  valor: number
  // El que se usa cuando no se elige otro entre esas dos monedas.
  esDefault: boolean
  activo: boolean
  // «En la barra»: la empresa lo eligió para verlo en la barra superior (sólo se ve si está activo; hasta TOPE_EN_LA_BARRA).
  enLaBarra: boolean
  // ISO. La versión del tipo de cambio.
  actualizadoEn: string
}

export type CambioDeValor = {
  id: number
  // null en el primero: nació con ese valor.
  valorAnterior: number | null
  valorNuevo: number
  // El nombre de quien lo cambió, o null si fue el sistema o la persona ya no está a la vista.
  cambiadoPor: string | null
  cambiadoEn: string
}

export function monedasDesde(filas: readonly Tables<'monedas'>[]): Moneda[] {
  return filas.map((fila) => ({
    codigo: fila.codigo,
    nombre: fila.nombre,
    simbolo: fila.simbolo,
    decimales: fila.decimales,
    activa: fila.activa,
    actualizadoEn: fila.actualizado_en,
  }))
}

export function tiposCambioDesde(filas: readonly Tables<'tipos_cambio'>[]): TipoCambio[] {
  return filas.map((fila) => ({
    id: fila.id,
    clave: fila.clave,
    nombre: fila.nombre,
    monedaDe: fila.moneda_de,
    monedaA: fila.moneda_a,
    valor: fila.valor,
    esDefault: fila.es_default,
    activo: fila.activo,
    enLaBarra: fila.en_la_barra,
    actualizadoEn: fila.actualizado_en,
  }))
}

type FilaDeHistorial = Pick<
  Tables<'tipos_cambio_historial'>,
  'id' | 'valor_anterior' | 'valor_nuevo' | 'cambiado_por' | 'cambiado_en'
>

// Cuántos cambios del historial se ven: la lectura pide uno de más y, si lo hay, el historial lo dice (cierre 1).
export const CAMBIOS_A_LA_VISTA = 30

// El historial de un tipo de cambio, con el nombre de quien hizo cada cambio (`nombres`: id de la
// persona → cómo se la muestra).
export function historialDesde(
  filas: readonly FilaDeHistorial[],
  nombres: ReadonlyMap<string, string>,
): CambioDeValor[] {
  return filas.map((fila) => ({
    id: fila.id,
    valorAnterior: fila.valor_anterior,
    valorNuevo: fila.valor_nuevo,
    cambiadoPor: fila.cambiado_por ? (nombres.get(fila.cambiado_por) ?? null) : null,
    cambiadoEn: fila.cambiado_en,
  }))
}

// Los que se pueden usar hoy, con el por defecto adelante.
export function vigentes(tipos: readonly TipoCambio[]): TipoCambio[] {
  return tipos
    .filter((tipo) => tipo.activo)
    .sort((uno, otro) => Number(otro.esDefault) - Number(uno.esDefault))
}

// Cuántos se ven a la vista en la barra superior. Espejo del 3 de `tipo_cambio_guardar()`, que cuenta los activos marcados.
export const TOPE_EN_LA_BARRA = 3

// Lo que el layout pasa a la barra de toda pantalla: lo justo para dibujarlo (el popover lee lo demás al abrirse).
export type TipoEnLaBarra = Pick<TipoCambio, 'id' | 'nombre' | 'monedaA' | 'valor'>

// Los que la barra superior muestra a la vista: los activos marcados «En la barra», con el por defecto adelante y hasta el tope (al reactivar
// uno marcado puede haber más: se cortan). Sin ninguno, el por defecto, como si nadie hubiera elegido: la barra nunca queda vacía.
export function tiposEnLaBarra(tipos: readonly TipoCambio[]): TipoCambio[] {
  const activos = vigentes(tipos)
  const marcados = activos.filter((tipo) => tipo.enLaBarra)
  return marcados.length > 0 ? marcados.slice(0, TOPE_EN_LA_BARRA) : activos.slice(0, 1)
}

export function paraLaBarra(tipos: readonly TipoCambio[]): TipoEnLaBarra[] {
  return tiposEnLaBarra(tipos).map(({ id, nombre, monedaA, valor }) => ({
    id,
    nombre,
    monedaA,
    valor,
  }))
}

export type MotivoParaNoMarcar = 'inactivo' | 'tope'

// Por qué un tipo de cambio no se puede sumar a la barra (null si se puede), con lo que dice el formulario: `activo` es el interruptor, no lo
// guardado. Uno ya marcado siempre se puede quitar; el tope cuenta los otros activos marcados, como la base.
export function motivoParaNoMarcar(pedido: {
  tipo: TipoCambio
  activo: boolean
  tipos: readonly TipoCambio[]
}): MotivoParaNoMarcar | null {
  const { tipo, activo, tipos } = pedido
  if (tipo.enLaBarra) {
    return null
  }
  if (!activo) {
    return 'inactivo'
  }
  const otros = tipos.filter((uno) => uno.id !== tipo.id && uno.activo && uno.enLaBarra)
  return otros.length >= TOPE_EN_LA_BARRA ? 'tope' : null
}

const LARGO_MAXIMO_CLAVE = 31

// La clave de un tipo de cambio a partir de su nombre, con la forma que exige la base
// (`^[a-z][a-z0-9_]{1,30}$`). «Banco Unión» → `banco_union`. null si del nombre no sale una.
export function claveDeTipoCambio(nombre: string): string | null {
  const clave = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .slice(0, LARGO_MAXIMO_CLAVE)
    .replace(/_+$/, '')
  return clave.length >= 2 ? clave : null
}

const DECIMALES_MINIMOS = 2
const DECIMALES_MAXIMOS = 6

// Con cuántos decimales se muestra un valor: los que tiene, entre 2 y 6 (la base guarda 6).
// 6.96 → 2; 12.405 → 3; 0.000145 → 6.
export function decimalesDeValor(valor: number): number {
  for (let decimales = DECIMALES_MINIMOS; decimales < DECIMALES_MAXIMOS; decimales++) {
    const factor = 10 ** decimales
    if (Math.abs(Math.round(valor * factor) / factor - valor) < 1e-9) {
      return decimales
    }
  }
  return DECIMALES_MAXIMOS
}

// El valor guardado como se abre para editar: toda su precisión, el decimal del locale de la empresa y sin miles (4.13-3c).
export const textoParaEditar = (valor: number, locale: string): string =>
  formatearParaEditar(valor, { locale })

export const VALOR_INVALIDO = 'Escribe un valor mayor que cero, con hasta 6 decimales.'

export type ValorTipeado = { ok: true; valor: number } | { ok: false; motivo: string }

// Lo que se tipea en el campo del valor, con el lector de toda la app y el locale de la empresa (4-25): en es-BO «6,96» y «12.405» (doce mil
// cuatrocientos cinco, P5 del 4.13-3c); «6.96» dice su aviso. Tiene que ser mayor que cero y con los decimales que guarda la base.
export function valorTipeado(texto: string, locale: string): ValorTipeado {
  const leido = leerNumeroTipeado(texto, locale)
  if (!leido.ok) {
    return {
      ok: false,
      motivo:
        leido.motivo === 'separador' ? avisoDeNumero(texto, leido.motivo, locale) : VALOR_INVALIDO,
    }
  }
  return leido.valor !== null && leido.valor > 0 && leido.decimales <= DECIMALES_MAXIMOS
    ? { ok: true, valor: leido.valor }
    : { ok: false, motivo: VALOR_INVALIDO }
}
