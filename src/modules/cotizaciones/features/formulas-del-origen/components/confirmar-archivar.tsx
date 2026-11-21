'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'
import { archivarFormulaDelOrigen } from '../actions/archivar-formula'
import { useConfirmarEnLaFormula } from '../hooks/use-confirmar-en-la-formula'
import { ConfirmarEnLaFormula } from './confirmar-en-la-formula'

type Props = {
  abierto: boolean
  alCerrar: () => void
  origenId: string
  formula: Pick<FormulaDeLaLista, 'id' | 'nombre' | 'actualizadoEn'>
  // Desde la cabeza del editor: al entrar se vuelve a la lista.
  volverALaLista: boolean
}

export const DESCRIPCION_DE_ARCHIVAR =
  'Deja de verse en la lista y no se puede activar; sus versiones y las cotizaciones que la usaron quedan. Se encuentra en «Archivadas».'

// «Archivar «<nombre>»» (`?panel=archivar-formula&formula=<id>`), con la versión que se leyó.
export function ConfirmarArchivar({ abierto, alCerrar, origenId, formula, volverALaLista }: Props) {
  const archivar = useAction(archivarFormulaDelOrigen)
  const estado = useConfirmarEnLaFormula({
    origenId,
    alCerrar,
    volverALaLista,
    pedir: () =>
      enviarAccion(
        archivar.executeAsync({ id: formula.id, origenId, esperada: formula.actualizadoEn }),
        'No se pudo archivar la fórmula.',
      ),
    hecho: `Archivaste «${formula.nombre}».`,
  })
  return (
    <ConfirmarEnLaFormula
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Archivar «${formula.nombre}»`}
      descripcion={DESCRIPCION_DE_ARCHIVAR}
      etiqueta="Archivar"
      estado={estado}
    />
  )
}
