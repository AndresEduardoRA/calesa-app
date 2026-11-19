// La frase de la subasta (docs/GLOSARIO.md): «Subasta» de la ficha dicha en una línea con color y cuenta, según la situación que calcula la base. No
// la copia: la nombra. Sin I/O.
import type { Situacion } from './situacion'
import { cuentaRegresiva } from './subasta-tiempo'

export type TonoDeLaFrase = 'info' | 'aviso' | 'exito' | 'apagado' | 'neutro'

// Qué dibuja la ficha al lado del texto.
export type IconoDeLaFrase = 'reloj' | 'alerta' | 'ganada' | 'no_ganada' | 'calendario'

export type FraseDeSubasta = { texto: string; tono: TonoDeLaFrase; icono: IconoDeLaFrase }

type Fechas = { subastaEn: string | null; subastaFinEn: string | null }

/** El cierre de la subasta: el fin si lo hay, si no el inicio (como `cierre_subasta_en` de la base). */
export function cierreDeLaSubasta({ subastaEn, subastaFinEn }: Fechas): string | null {
  return subastaFinEn ?? subastaEn
}

// La distancia al cierre («en 2 días 4 h», «hace 3 h»), o null sin cierre o con una fecha que no se entiende.
function cuentaAlCierre(fechas: Fechas, ahora: Date) {
  const cierre = cierreDeLaSubasta(fechas)
  return cierre === null ? null : cuentaRegresiva(cierre, ahora)
}

/**
 * La frase de la subasta. «Ganada» sin copiar la situación: en un origen de subasta, con la situación `fase` y el cierre vencido, la única forma de
 * seguir es haberla ganado (si no, sería «Sin resolver» o «No ganada»). Con el cierre futuro y ya fuera del tramo, la cuenta sin el color de éxito.
 */
export function fraseDeSubasta({
  situacion,
  ahora,
  ...fechas
}: Fechas & { situacion: Situacion; ahora: Date }): FraseDeSubasta {
  const cuenta = cuentaAlCierre(fechas, ahora)
  switch (situacion) {
    case 'en_subasta':
      if (cuenta === null) {
        return { texto: 'En subasta · sin fecha de cierre', tono: 'info', icono: 'calendario' }
      }
      // Vencida y en subasta: el job que la cierra todavía no corrió.
      return cuenta.tipo === 'por_empezar'
        ? { texto: `Se subasta ${cuenta.texto}`, tono: 'info', icono: 'reloj' }
        : { texto: `Cerró ${cuenta.texto}`, tono: 'info', icono: 'reloj' }
    case 'sin_resolver':
      return {
        texto: cuenta === null ? 'Cerró · sin resolver' : `Cerró ${cuenta.texto} · sin resolver`,
        tono: 'aviso',
        icono: 'alerta',
      }
    case 'no_ganada':
      return { texto: 'No ganada', tono: 'apagado', icono: 'no_ganada' }
    case 'fase':
      if (cuenta === null) {
        return { texto: 'Sin fecha de cierre', tono: 'neutro', icono: 'calendario' }
      }
      return cuenta.tipo === 'empezo'
        ? { texto: 'Ganada', tono: 'exito', icono: 'ganada' }
        : { texto: `Se subasta ${cuenta.texto}`, tono: 'neutro', icono: 'reloj' }
  }
}

/** «Puja actual» mientras la subasta sigue viva; «Puja final» si ya cerró. */
export function etiquetaDeLaPuja(situacion: Situacion, fechas: Fechas, ahora: Date): string {
  const cuenta = cuentaAlCierre(fechas, ahora)
  const viva = situacion === 'en_subasta' && (cuenta === null || cuenta.tipo === 'por_empezar')
  return viva ? 'Puja actual' : 'Puja final'
}
