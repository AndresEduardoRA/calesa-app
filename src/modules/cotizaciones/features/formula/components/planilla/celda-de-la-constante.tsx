'use client'

import { useCallback } from 'react'
import { useRegional } from '@/shared/ui/regional'
import { textoInicial, valorTipeado } from '../../../../entities/formula/ajuste'
import type { ValorCambiado } from '../../../../entities/formula/valor-en-la-planilla'
import { formatoDe, type Formato } from '../../../../entities/nodos'
import type { Lectura } from '../../hooks/use-edicion-de-celda'
import { ValorDeConstante } from '../editor/valor-de-constante'
import { CajaEditable } from './caja-editable'

type Props = {
  // La constante que cambia (la fila, o el `pct` de un `porcentaje_de` en B).
  nodo: string
  concepto: string
  valor: number | null
  formato: Formato | undefined
  bloqueada: boolean
  idDelMotivo: string
  alCambiar: (id: string, valor: number) => ValorCambiado
}

// El valor de una constante en la planilla (C, o el % en B): se tipea como en el ⚙ (el lector de la app con el locale; un porcentaje en puntos) y escribe `params` de
// la fórmula de trabajo con `cambiarValorDeConstante()`. Nunca pregunta: lo que no entra deja el valor de antes y dice por qué.
export function CeldaDeLaConstante({
  nodo,
  concepto,
  valor,
  formato,
  bloqueada,
  idDelMotivo,
  alCambiar,
}: Props) {
  const { locale } = useRegional()
  const f = formatoDe({ formato })
  const leer = useCallback(
    (texto: string): Lectura<number> => {
      const r = valorTipeado(texto, f, locale, null)
      return r.ok ? r : { ok: false, aviso: r.aviso }
    },
    [f, locale],
  )
  return (
    <CajaEditable<number>
      concepto={concepto}
      contenido={valor === null ? '—' : <ValorDeConstante valor={valor} formato={f} />}
      bloqueada={bloqueada}
      idDelMotivo={idDelMotivo}
      textoInicial={() => (valor === null ? '' : textoInicial(valor, f, locale))}
      leer={leer}
      alConfirmar={(n) => {
        const r = alCambiar(nodo, n)
        return r.ok ? { ok: true } : { ok: false, mensaje: r.mensaje }
      }}
    />
  )
}
