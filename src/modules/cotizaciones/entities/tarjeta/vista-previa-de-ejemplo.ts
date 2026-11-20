// Las cifras y los textos de ejemplo de la vista previa del editor de la plantilla (4.19-4, P6: se dicen). Determinista: nada de `Date`, que desajustaría la
// hidratación. Puro.
import type { CalculoDeLaTarjeta } from '../calculo-de-la-tarjeta'
import type { Estado } from '../motor-contexto'
import type { ContextoDeLaCotizacion } from './contexto-de-la-cotizacion'
import type { TarjetaLista } from './lectura-de-la-tarjeta'

export const CONTEXTO_DE_EJEMPLO: ContextoDeLaCotizacion = {
  // Corto como una fecha de verdad: la conversión la pone en la columna angosta del grupo.
  fecha: 'Fecha',
  numero: '123',
  titulo: 'Título de la cotización',
  // La foto sin url: la celda dibuja la muestra punteada «Foto».
  asesor: {
    nombre: 'Nombre del asesor',
    telefono: '+59170000000',
    cargo: 'Cargo del asesor',
    foto: '',
  },
  cliente: 'Nombre del cliente',
  vehiculo: { titulo: 'Vehículo de la cotización', lote: 'Lote', vin: 'VIN' },
  venceEl: 'Fecha de vencimiento',
  // Sin url: la marca dibuja su glifo neutro y el interruptor «Logo» se nota.
  empresa: 'Tu empresa',
  logo: { nombre: 'Tu empresa', url: '' },
}

export const PORCENTAJE_DE_EJEMPLO = 0.05
export const TIPO_DE_CAMBIO_DE_EJEMPLO = 6.96

// La n-ésima fila con nodo (de arriba abajo, sin el total) vale `(n mod 8 + 1) × 250` USD; el total es la suma de los miembros de los grupos.
function montosDeEjemplo(
  tarjeta: TarjetaLista,
  valores: Map<string, number | string | null>,
  estados: Map<string, Estado>,
): number {
  let n = 0
  let suma = 0
  for (const f of tarjeta.definicion.filas) {
    if (f.nodo === undefined || f.nodo === tarjeta.total.nodo || valores.has(f.nodo)) continue
    const valor = ((n % 8) + 1) * 250
    valores.set(f.nodo, valor)
    estados.set(f.nodo, 'activo')
    if (tarjeta.nodos.get(f.nodo)?.grupo != null) suma += valor
    n += 1
  }
  return suma
}

// Los nodos de los tipos de cambio que nombra la lectura (por omisión y en cada modo).
const nodosDeTipoDeCambio = (tarjeta: TarjetaLista): string[] =>
  [
    ...tarjeta.tiposDeCambio.buckets.values(),
    ...[...tarjeta.tiposDeCambio.modos.values()].flatMap((m) => [...m.values()]),
  ].flatMap((tc) => (tc.nodo === null ? [] : [tc.nodo]))

// Las cifras de ejemplo: los montos de arriba, cada `pct` 5 %, cada tipo de cambio 6,96, la variante su primera opción y el modo el primero. Todo nodo
// nombrado aplica: con estas cifras nada se oculta.
export function calculoDeEjemplo(tarjeta: TarjetaLista): CalculoDeLaTarjeta {
  const valores = new Map<string, number | string | null>()
  const estados = new Map<string, Estado>([...tarjeta.nodos.keys()].map((id) => [id, 'activo']))
  const suma = montosDeEjemplo(tarjeta, valores, estados)
  for (const nodo of tarjeta.nodos.values()) {
    if (nodo.pct !== null) valores.set(nodo.pct, PORCENTAJE_DE_EJEMPLO)
  }
  for (const tc of nodosDeTipoDeCambio(tarjeta)) valores.set(tc, TIPO_DE_CAMBIO_DE_EJEMPLO)
  const opcion = tarjeta.variante?.opciones[0]
  if (tarjeta.variante !== null && opcion !== undefined)
    valores.set(tarjeta.variante.nodo, opcion.clave)
  const [modo] = tarjeta.modos.keys()
  return {
    valores,
    estados,
    totales: { usd: suma, bs: null },
    modoTc: modo ?? null,
    verTotalBs: false,
  }
}
