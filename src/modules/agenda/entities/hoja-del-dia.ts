// La hoja del día (Glosario: «Hoja del día»): el día como una hoja de libreta, hora por hora. Las horas de la jornada se ven siempre; lo que cae
// antes va arriba («Antes») y lo de después, abajo («Después»). La hora de cada cosa es la de la zona de la empresa (nunca la del navegador ni
// «+24 h»): un día con cambio de horario tiene las mismas filas. Puro: cero I/O.
import { diaEnZona, localDeInstante } from '@/shared/lib/fechas'

// La jornada que se dibuja siempre: de las 08:00 a las 20:00 (la última fila es la de las 19:00).
export const JORNADA = { desde: 8, hasta: 20 } as const

export type FilaDeHora<T> = {
  hora: number
  // «08:00»
  etiqueta: string
  entradas: T[]
  // La hora actual cae en esta fila (sólo si el día es hoy).
  ahora: boolean
}

export type TramoFuera<T> = { entradas: T[]; ahora: boolean }

export type HojaDelDia<T> = {
  antes: TramoFuera<T>
  horas: FilaDeHora<T>[]
  despues: TramoFuera<T>
}

type Opciones = {
  // El día de la hoja, `YYYY-MM-DD` en la zona de la empresa.
  dia: string
  zona: string
  // El instante actual, ISO (lo calcula el servidor y lo hace avanzar el navegador).
  ahora: string
}

// La hora local (0–23) de un instante en la zona, y su día.
function enZona(instante: string, zona: string): { dia: string; hora: number } {
  const local = localDeInstante(instante, { zona })
  return { dia: local.slice(0, 10), hora: Number(local.slice(11, 13)) }
}

function etiquetaDe(hora: number): string {
  return `${String(hora).padStart(2, '0')}:00`
}

// Reparte las entradas del día en «Antes», las horas de la jornada y «Después», cada parte por instante y luego por id (orden estable). Lo que es
// de otro día en la zona de la empresa no entra. La marca de «ahora» va en la fila, en «Antes» o en «Después», y sólo si el día es hoy.
export function hojaDelDia<T extends { id: string; instante: string }>(
  entradas: readonly T[],
  { dia, zona, ahora }: Opciones,
): HojaDelDia<T> {
  const ordenadas = [...entradas].sort(
    (a, b) =>
      Date.parse(a.instante) - Date.parse(b.instante) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
  const horas: FilaDeHora<T>[] = Array.from(
    { length: JORNADA.hasta - JORNADA.desde },
    (_, indice) => {
      const hora = JORNADA.desde + indice
      return { hora, etiqueta: etiquetaDe(hora), entradas: [], ahora: false }
    },
  )
  const antes: TramoFuera<T> = { entradas: [], ahora: false }
  const despues: TramoFuera<T> = { entradas: [], ahora: false }
  const lugarDe = (hora: number) =>
    hora < JORNADA.desde ? antes : hora >= JORNADA.hasta ? despues : horas[hora - JORNADA.desde]
  for (const entrada of ordenadas) {
    const local = enZona(entrada.instante, zona)
    if (local.dia === dia) {
      lugarDe(local.hora)?.entradas.push(entrada)
    }
  }
  if (diaEnZona(ahora, { zona }) === dia) {
    const lugar = lugarDe(enZona(ahora, zona).hora)
    if (lugar) {
      lugar.ahora = true
    }
  }
  return { antes, horas, despues }
}

// «Antes de las 08:00» y «Desde las 20:00»: los rótulos de lo que cae fuera de la jornada.
export const ROTULO_DE_ANTES = `Antes de las ${etiquetaDe(JORNADA.desde)}`
export const ROTULO_DE_DESPUES = `Desde las ${etiquetaDe(JORNADA.hasta)}`
