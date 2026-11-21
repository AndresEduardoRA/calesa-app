import { cn } from 'cn'
import { partesDelTexto } from '@/shared/lib/texto-con-variables'

// La pastilla de una variable: fondo de info (de peligro si el texto no la acepta) con un `box-shadow` de 2 px y **sin padding ni borde**,
// para que no mueva el texto: el espejo del editor tiene que medir lo mismo que la `<textarea>` que lo tapa.
export const PASTILLA =
  'rounded-sm bg-(--color-info-soft) text-(--color-info-ink) shadow-[0_0_0_2px_var(--color-info-soft)]'
export const PASTILLA_DESCONOCIDA =
  'rounded-sm bg-(--color-peligro-soft) text-(--color-peligro-ink) shadow-[0_0_0_2px_var(--color-peligro-soft)]'

type Props = {
  texto: string
  // Las variables que ese texto acepta.
  claves: readonly string[]
  // El valor de cada variable, para mostrar el texto como se verá. Sin él, se ve `{cliente}`.
  valores?: Readonly<Record<string, string>>
  // Con `false` las variables se reemplazan sin resaltar (la vista previa, como llega al cliente). Por omisión se resaltan.
  resaltar?: boolean
}

// Un texto en segmentos con sus variables resaltadas. Con `valores`, cada variable muestra su valor; lo que no es una variable que se
// acepta queda literal (con `resaltar`, en rojo, para verlo). Siempre texto, nunca HTML. Sin `'use client'`: lo usan el espejo del editor,
// la vista previa y la tarjeta.
export function TextoConVariables({ texto, claves, valores, resaltar = true }: Props) {
  return (
    <>
      {partesDelTexto(texto, claves).map((parte, n) => {
        if (parte.tipo === 'texto') {
          return <span key={n}>{parte.valor}</span>
        }
        const valor =
          parte.tipo === 'variable' && valores?.[parte.clave] !== undefined
            ? valores[parte.clave]
            : parte.valor
        if (!resaltar) {
          return <span key={n}>{valor}</span>
        }
        return (
          <span
            key={n}
            data-variable={parte.clave}
            className={cn(parte.tipo === 'variable' ? PASTILLA : PASTILLA_DESCONOCIDA)}
          >
            {valor}
          </span>
        )
      })}
    </>
  )
}
