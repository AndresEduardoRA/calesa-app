'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError } from '@/shared/ui/toasts'
import type { ApagadosDePush } from '../../../entities/preferencia-de-push'
import { guardarPreferenciaDePush } from '../actions/guardar-preferencia-de-push'

function omitir(apagados: ApagadosDePush, tipo: string): ApagadosDePush {
  return Object.fromEntries(
    Object.entries(apagados).filter(([clave]) => clave !== tipo),
  ) as ApagadosDePush
}

// Los avisos push que la persona apagó por tipo. Cambia al instante y, si la base no lo guarda, vuelve atrás con un aviso. Vive en quien dibuja la tarjeta y
// su modal: los dos muestran lo mismo.
export function usePreferenciasPorTipo(apagadosIniciales: ApagadosDePush) {
  const [apagados, setApagados] = useState<ApagadosDePush>(apagadosIniciales)
  const [guardando, setGuardando] = useState<ReadonlySet<string>>(new Set())
  const { executeAsync } = useAction(guardarPreferenciaDePush)

  const cambiar = async (tipo: string, encendido: boolean) => {
    const antes = apagados
    setApagados(encendido ? omitir(antes, tipo) : { ...antes, [tipo]: false })
    setGuardando((actual) => new Set(actual).add(tipo))
    const resultado = resultadoDeAccion(await conRed(executeAsync({ tipo, encendido })))
    if (!resultado.ok) {
      setApagados(antes)
      avisarError(resultado.error)
    }
    setGuardando((actual) => {
      const resto = new Set(actual)
      resto.delete(tipo)
      return resto
    })
  }
  return { apagados, guardando, cambiar }
}

export type PreferenciasPorTipo = ReturnType<typeof usePreferenciasPorTipo>
