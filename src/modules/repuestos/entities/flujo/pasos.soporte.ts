import type { FilaDeItem } from '../nucleo/item'
import type {
  FaseDeLosPasos,
  FlujoDeLosPasos,
  HitoDelPaso,
  PedidoDeHito,
  SalidaDeLosPasos,
} from './pasos-del-flujo'

// Lo común de las pruebas de los pasos y del siguiente: un flujo como el de la semilla, armado a mano (los nombres son de prueba; la regla nunca los lee).

export const G = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export const fase = (
  n: number,
  nombre: string,
  orden: number,
  extra: Partial<FaseDeLosPasos> = {},
): FaseDeLosPasos => ({
  id: G(n),
  nombre,
  color: '#717c93',
  orden,
  activa: true,
  esInicial: false,
  esFinal: false,
  ...extra,
})

export const salida = (de: number, a: number, accion: string | null = null): SalidaDeLosPasos => ({
  de: G(de),
  a: G(a),
  accion,
})

export const pide = (faseN: number, hito: HitoDelPaso, bloqueante = true): PedidoDeHito => ({
  faseId: G(faseN),
  hito,
  bloqueante,
})

// Por cotizar (1) → Comprado (2) → En tránsito (3) → Recibido (4) | Perdido (5).
export const FASES = [
  fase(1, 'Por cotizar', 10, { esInicial: true }),
  fase(2, 'Comprado', 20),
  fase(3, 'En tránsito', 30),
  fase(4, 'Recibido', 40, { esFinal: true }),
  fase(5, 'Perdido', 50, { esFinal: true }),
]

export const SALIDAS = [
  salida(1, 2, 'Comprar'),
  salida(2, 3, 'Despachar'),
  salida(3, 4, 'Recibir'),
  salida(3, 5, 'Dar por perdido'),
]

export const flujo = (extra: Partial<FlujoDeLosPasos> = {}): FlujoDeLosPasos => ({
  fases: FASES,
  salidas: SALIDAS,
  pedidos: [],
  ...extra,
})

/** Un ítem en esa fase (nula = sin fase), con o sin precio. */
export function item(
  faseN: number | null,
  precio: number | null = null,
): Pick<FilaDeItem, 'fase' | 'precioCliente'> {
  const f = faseN === null ? null : FASES.find((x) => x.id === G(faseN))
  return {
    precioCliente: precio,
    fase:
      faseN === null
        ? null
        : {
            id: G(faseN),
            nombre: f?.nombre ?? 'Jubilada',
            color: '#000000',
            esFinal: f?.esFinal ?? false,
          },
  }
}
