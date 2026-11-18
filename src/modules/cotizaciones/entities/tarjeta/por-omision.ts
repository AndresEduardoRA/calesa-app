// La tarjeta «por omisión»: la de un origen sin plantilla que le sirva a la versión, o la de una cotización cuyo recálculo falló (sin estados con qué ocultar
// filas). Una cuadrícula armada a mano con la misma salida que la conversión: la fecha con el título de la cotización, el número, el asesor y el logo al costado,
// el vehículo y «Total» con el total en dólares (y en moneda local debajo, si se pidió). No nombra ningún nodo de la fórmula: el total sale de los totales (`total.nodo` es el suyo).
import type { PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import type { TarjetaLista } from './lectura-de-la-tarjeta'

const NODO_DEL_TOTAL = 'total'
const FINO = { todos: 'fino' } as const

const PLANTILLA_POR_OMISION: PlantillaEnCuadricula = {
  forma: 2,
  columnas: [
    { id: 'concepto', ancho: 120 },
    { id: 'monto', ancho: 340 },
    { id: 'logo', ancho: 140 },
  ],
  filas: [
    { id: 'fecha', alto: 25, ocultar_si: 'nunca' },
    { id: 'numero', alto: 25, ocultar_si: 'nunca' },
    { id: 'asesor', alto: 25, ocultar_si: 'nunca' },
    { id: 'vehiculo', alto: 28, ocultar_si: 'nunca' },
    { id: 'total', alto: 54, ocultar_si: 'nunca' },
  ],
  celdas: [
    {
      id: 'c_fecha_concepto',
      fila: 'fecha',
      columna: 'concepto',
      contenido: { tipo: 'dato', variable: 'fecha_larga' },
    },
    {
      id: 'c_fecha_monto',
      fila: 'fecha',
      columna: 'monto',
      contenido: { tipo: 'dato', variable: 'titulo' },
    },
    { id: 'c_logo', fila: 'fecha', columna: 'logo', abarca_filas: 3, contenido: { tipo: 'logo' } },
    {
      id: 'c_numero_concepto',
      fila: 'numero',
      columna: 'concepto',
      contenido: { tipo: 'texto', texto: 'Cotización n.º' },
    },
    {
      id: 'c_numero_monto',
      fila: 'numero',
      columna: 'monto',
      contenido: { tipo: 'dato', variable: 'numero' },
    },
    {
      id: 'c_asesor_concepto',
      fila: 'asesor',
      columna: 'concepto',
      contenido: { tipo: 'texto', texto: 'Asesor:' },
    },
    {
      id: 'c_asesor_monto',
      fila: 'asesor',
      columna: 'monto',
      contenido: { tipo: 'dato', variable: 'asesor_nombre' },
    },
    {
      id: 'c_vehiculo_concepto',
      fila: 'vehiculo',
      columna: 'concepto',
      abarca_columnas: 3,
      contenido: { tipo: 'dato', variable: 'vehiculo_titulo' },
      estilo: { tamano: 14, negrita: true },
    },
    {
      id: 'c_total_concepto',
      fila: 'total',
      columna: 'concepto',
      contenido: { tipo: 'texto', texto: 'Total' },
      estilo: { tamano: 16, negrita: true, bordes: FINO },
    },
    {
      id: 'c_total_monto',
      fila: 'total',
      columna: 'monto',
      abarca_columnas: 2,
      contenido: { tipo: 'dato', nodo: NODO_DEL_TOTAL, mostrar: 'monto' },
      estilo: { tamano: 16, negrita: true, alinear: 'derecha', bordes: FINO },
    },
  ],
}

export const tarjetaPorOmision = (): TarjetaLista => ({
  estado: 'lista',
  definicion: PLANTILLA_POR_OMISION,
  nodos: new Map([
    [NODO_DEL_TOTAL, { etiqueta: 'Total', descripcion: null, grupo: null, pct: null }],
  ]),
  grupos: new Map(),
  tiposDeCambio: { buckets: new Map(), modos: new Map() },
  modos: new Map(),
  variante: null,
  colores: new Map(),
  total: { nodo: NODO_DEL_TOTAL },
})
