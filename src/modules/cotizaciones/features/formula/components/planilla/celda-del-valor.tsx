'use client'

import { textoDelFaltante } from '../../../../entities/textos-de-faltantes'
import type { CifraDeLaFila } from '../../../../entities/formula/vista-previa'
import { formatoDe } from '../../../../entities/nodos'
import { ValorDeConstante } from './comunes/valor-de-constante'

// Las cifras de la planilla llevan 2 decimales (los montos, los de `<Monto>`).
const DECIMALES = 2

const APAGADA = {
  fuera_de_variante: 'Fuera de la variante elegida.',
  condicion_apagada: 'Su interruptor está apagado.',
} as const

// Sin cifra posible: «—» con su motivo en el `title` y para el lector (nunca una cifra en `title`).
function Raya({ motivo }: { motivo: string }) {
  return (
    <span title={motivo} className="text-(--color-ink-soft)">
      —<span className="sr-only"> {motivo}</span>
    </span>
  )
}

// La celda C de una fila que se calcula, con la unidad de ejemplo: su valor con el formato de su nodo (el dinero por `<Monto>`), la clave de la variante, o «—» con
// su motivo. Mientras se leen los tipos de cambio y las tablas, «…». Sin envoltorio de más: la planilla dibuja hasta 500 filas.
export function CeldaDelValor({ cifra, leyendo }: { cifra: CifraDeLaFila; leyendo: boolean }) {
  if (leyendo) return <span aria-label="Calculando">…</span>
  switch (cifra.tipo) {
    case 'nada':
      return null
    case 'valor':
      // Sin `formato`, un nodo es dinero (`usd`, como `formatoDe()` de la base).
      return (
        <ValorDeConstante
          valor={cifra.valor}
          formato={formatoDe({ formato: cifra.formato })}
          decimales={DECIMALES}
        />
      )
    case 'texto':
      return <>{cifra.texto}</>
    case 'sin_cifra':
      return (
        <Raya
          motivo={
            cifra.faltante === null
              ? 'Sin cifra: depende de algo que falta.'
              : textoDelFaltante(cifra.faltante)
          }
        />
      )
    case 'apagada':
      return <Raya motivo={APAGADA[cifra.estado]} />
    default: {
      const _: never = cifra
      return _
    }
  }
}
