'use client'

import { useState } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import type { ErrorDelTotal } from '../../../../../entities/formula/total-de-la-formula'
import type { Planilla } from '../../../hooks/use-planilla'
import { FormularioDelTotal } from './formulario-del-total'

const SIN_ERRORES: readonly ErrorDelTotal[] = []

// El panel «Total y tipos de cambio» (`?panel=total-y-tipos-de-cambio`, D14, D20). Al aplicar se cierra y el foco vuelve a la grilla. El formulario lleva `key` por
// apertura.
export function PanelDelTotal({ planilla }: { planilla: Planilla }) {
  const { total } = planilla.paneles
  const [errores, setErrores] = useState(SIN_ERRORES)
  const [apertura, setApertura] = useState(0)
  const [antes, setAntes] = useState(total.abierto)
  if (total.abierto !== antes) {
    setAntes(total.abierto)
    if (total.abierto) {
      setApertura((n) => n + 1)
      setErrores(SIN_ERRORES)
    }
  }
  return (
    <Drawer abierto={total.abierto} alCerrar={total.cerrar} titulo="Total y tipos de cambio">
      {total.abierto ? (
        <FormularioDelTotal
          key={apertura}
          trabajo={planilla.editor.trabajo}
          errores={errores}
          alAplicar={(cambios) => {
            const r = planilla.bandas.cambiarTotal(cambios)
            if (r !== null) return void setErrores(r)
            total.cerrar()
            planilla.enfocar()
          }}
          alCancelar={total.cerrar}
        />
      ) : null}
    </Drawer>
  )
}
