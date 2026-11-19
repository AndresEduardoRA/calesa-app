'use client'

import { useId, useState } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

type Props = {
  etiqueta: string
  valor: number
  minimo: number
  maximo: number
  // Se manda al confirmar un número entero dentro del rango (Enter o al salir); si no, vuelve al de antes.
  alCambiar: (valor: number) => void
}

// Un número del panel (el ancho de una columna, el alto de una fila), en px.
export function CampoDeNumero({ etiqueta, valor, minimo, maximo, alCambiar }: Props) {
  const id = useId()
  const [escrito, setEscrito] = useState(String(valor))
  const [previo, setPrevio] = useState(valor)
  if (valor !== previo) {
    setPrevio(valor)
    setEscrito(String(valor))
  }
  const confirmar = () => {
    const n = Number(escrito)
    if (Number.isInteger(n) && n >= minimo && n <= maximo && n !== valor) alCambiar(n)
    else setEscrito(String(valor))
  }
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id}>{etiqueta}</Label>
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={minimo}
          max={maximo}
          value={escrito}
          onChange={(e) => {
            setEscrito(e.target.value)
          }}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              confirmar()
            }
          }}
          className="min-h-11 w-24 tabular-nums md:min-h-9"
        />
        <span className="text-(length:--text-sm) text-(--color-ink-soft)">px</span>
      </div>
    </div>
  )
}
