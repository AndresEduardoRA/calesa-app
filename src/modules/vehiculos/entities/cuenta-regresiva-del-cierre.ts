// La cuenta regresiva del cierre de una subasta («Cierra en 2 d 04:12:33»), como la dicen la lista de vehículos y la ficha: el texto, su tono y cada cuánto hay
// que volver a contarla. Sin I/O: el instante llega de quien cuenta.
import { cuentaRegresiva } from './subasta-tiempo'

export type TonoDeLaCuenta = 'normal' | 'aviso' | 'urgente' | 'cerrando' | 'cerro' | 'sin_fecha'

export type CuentaDelCierre = { texto: string; tono: TonoDeLaCuenta }

const SEGUNDO = 1000
const MINUTO = 60 * SEGUNDO
const HORA = 60 * MINUTO
const DIA = 24 * HORA

// Con menos de un día, ámbar; con menos de una hora, roja.
export const UMBRAL_DE_AVISO = DIA
export const UMBRAL_DE_URGENCIA = HORA

// Cuánto después del cierre dice «Cerrando…» (lo que tarda la base en marcar la subasta como cerrada) antes de pasar a «Cerró hace…».
export const MARGEN_DEL_CIERRE = MINUTO

export const SIN_FECHA_DE_CIERRE = 'Sin fecha de cierre'
export const CERRANDO = 'Cerrando…'

const dos = (n: number): string => String(n).padStart(2, '0')

// «2 d 04:12:33»; sin días, «04:12:33».
function reloj(faltan: number): string {
  const segundos = Math.floor(faltan / SEGUNDO)
  const dias = Math.floor(segundos / 86_400)
  const horas = Math.floor((segundos % 86_400) / 3600)
  const minutos = Math.floor((segundos % 3600) / 60)
  const resto = segundos % 60
  const hora = `${dos(horas)}:${dos(minutos)}:${dos(resto)}`
  return dias > 0 ? `${String(dias)} d ${hora}` : hora
}

// Sin segundos («2 d 4 h 12 min», «12 min»): lo que se dice cuando la cuenta sólo se vuelve a contar cada minuto, redondeado hacia arriba.
function relojSinSegundos(faltan: number): string {
  const minutos = Math.ceil(faltan / MINUTO)
  const dias = Math.floor(minutos / 1440)
  const horas = Math.floor((minutos % 1440) / 60)
  const resto = minutos % 60
  return [
    dias > 0 ? `${String(dias)} d` : null,
    horas > 0 || (dias > 0 && resto > 0) ? `${String(horas)} h` : null,
    resto > 0 || (dias === 0 && horas === 0) ? `${String(resto)} min` : null,
  ]
    .filter((parte) => parte !== null)
    .join(' ')
}

// Lo que dice la cuenta al instante `ahora` (ms). Sin fecha (o una que no se entiende): «Sin fecha de cierre». En 0: «Cerrando…» y, pasado el margen,
// «Cerró hace 3 min». Con `conSegundos` falso (menos movimiento), sin segundos: no se cuenta lo que no se va a mover.
export function cuentaDelCierre(
  cierre: string | null,
  ahora: number,
  conSegundos = true,
): CuentaDelCierre {
  const instante = cierre === null ? Number.NaN : new Date(cierre).getTime()
  if (Number.isNaN(instante)) {
    return { texto: SIN_FECHA_DE_CIERRE, tono: 'sin_fecha' }
  }
  const faltan = instante - ahora
  if (faltan > 0) {
    // Hacia arriba: «00:00:01» es el último segundo y el 0 es el cierre.
    const entero = Math.ceil(faltan / SEGUNDO) * SEGUNDO
    const tono: TonoDeLaCuenta =
      entero < UMBRAL_DE_URGENCIA ? 'urgente' : entero < UMBRAL_DE_AVISO ? 'aviso' : 'normal'
    return { texto: `Cierra en ${conSegundos ? reloj(entero) : relojSinSegundos(faltan)}`, tono }
  }
  if (-faltan < MARGEN_DEL_CIERRE) {
    return { texto: CERRANDO, tono: 'cerrando' }
  }
  const hace = cuentaRegresiva(new Date(instante).toISOString(), new Date(ahora))
  return { texto: `Cerró ${hace?.texto ?? ''}`.trim(), tono: 'cerro' }
}

// Cada cuánto hay que volver a contarla: cada segundo, o cada minuto si quien mira pidió menos movimiento (`prefers-reduced-motion`).
export function periodoDeLaCuenta(menosMovimiento: boolean): number {
  return menosMovimiento ? MINUTO : SEGUNDO
}
