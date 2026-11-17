'use client'

import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { AUTOMATICO, OPCIONES_DE_COLUMNAS } from './etiquetas-del-aspecto'

type Props = {
  nombre: string
  etiqueta: string
  // Las columnas que ocupa; nulo, «Automático» (sólo si se ofrece).
  valor: number | null
  // La sección sin ancho es «Automática»: la mitad con lugar, si no la fila entera.
  automatico?: string
  ocupado: boolean
  error?: string | undefined
  alCambiar: (columnas: number | null) => void
}

// Cuántas de las 12 columnas de la rejilla ocupa una pieza: de «12 columnas (toda la fila)» a «1 columna».
export function SelectorDeColumnas({
  nombre,
  etiqueta,
  valor,
  automatico,
  ocupado,
  error,
  alCambiar,
}: Props) {
  const opciones =
    automatico === undefined
      ? OPCIONES_DE_COLUMNAS
      : [{ valor: AUTOMATICO, etiqueta: automatico }, ...OPCIONES_DE_COLUMNAS]
  return (
    <CampoSeleccion
      nombre={nombre}
      etiqueta={etiqueta}
      opciones={opciones}
      value={valor === null ? AUTOMATICO : String(valor)}
      disabled={ocupado}
      {...(error === undefined ? {} : { error })}
      onChange={(evento) => {
        const v = evento.target.value
        alCambiar(v === AUTOMATICO ? null : Number(v))
      }}
    />
  )
}
