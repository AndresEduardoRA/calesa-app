'use client'

import type { ReactNode } from 'react'
import { fechaRelativa } from '@/shared/lib/fechas'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { decimalesDeValor } from '../../../../entities/tipos-cambio'
import type { ConflictoDelEditor } from '../../hooks/use-valor-en-la-barra'

type Props = {
  conflicto: ConflictoDelEditor
  alRecargar: () => void
}

// Otra persona guardó antes (PT409): «Gina Barra lo cambió a Bs 12,40 hace 2 minutos.», con «Recargar». Se arma acá con lo releído y no lo
// escribe la base: el monto va por <Monto> (el Modo Live lo oculta). Si releer falló, el texto de siempre de la base.
export function ConflictoDeValor({ conflicto, alRecargar }: Props) {
  const { zonaHoraria } = useRegional()
  const { de } = conflicto
  const hace = (iso: string) => fechaRelativa(iso, { zona: zonaHoraria, numerico: true })
  let mensaje: ReactNode = conflicto.mensaje
  if (de?.tipo === 'ya_no_esta') {
    mensaje = 'Ese tipo de cambio ya no está activo.'
  } else if (de?.tipo === 'valor') {
    mensaje = (
      <>
        {de.quien ?? 'Otra persona'} lo cambió a{' '}
        <Monto valor={de.valor} moneda={de.moneda} decimales={decimalesDeValor(de.valor)} />
        {de.cuando ? ` ${hace(de.cuando)}` : ''}.
      </>
    )
  } else if (de?.tipo === 'otro') {
    mensaje = `${de.quien ?? 'Otra persona'} cambió este tipo de cambio ${hace(de.cuando)}.`
  }
  return <AvisoDeConflicto mensaje={mensaje} alRecargar={alRecargar} />
}
